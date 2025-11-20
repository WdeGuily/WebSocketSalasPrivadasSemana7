// server-ws.js
const WebSocket = require('ws')

const wss = new WebSocket.Server({ port: 8080 }, () => {
	console.log('WebSocket server listening on ws://localhost:8080')
})

// Room management
const rooms = new Map() // roomId -> { users: [{ ws, userId, username }], maxUsers: 2 }
const userToRoom = new Map() // ws -> roomId

function generateRoomId() {
	return Math.random().toString(36).substring(2, 8).toUpperCase()
}

function getRoomsList() {
	const roomsList = []
	rooms.forEach((room, roomId) => {
		roomsList.push({
			roomId,
			users: room.users.map(u => ({ userId: u.userId, username: u.username })),
			isFull: room.users.length >= room.maxUsers,
			userCount: room.users.length,
			maxUsers: room.maxUsers
		})
	})
	return roomsList
}

function broadcastRoomsList() {
	const roomsList = getRoomsList()
	const message = JSON.stringify({
		type: 'rooms-list',
		payload: { rooms: roomsList }
	})
	
	wss.clients.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(message)
		}
	})
}

function notifyRoomUsers(roomId) {
	const room = rooms.get(roomId)
	if (!room) return

	const usersList = room.users.map(u => ({ userId: u.userId, username: u.username }))
	const message = JSON.stringify({
		type: 'room-users',
		payload: { 
			roomId, 
			users: usersList,
			userCount: room.users.length,
			maxUsers: room.maxUsers
		}
	})

	room.users.forEach(user => {
		if (user.ws.readyState === WebSocket.OPEN) {
			user.ws.send(message)
		}
	})
}

wss.on('connection', (ws, req) => {
	console.log('Client connected')

	// send welcome
	ws.send(
		JSON.stringify({ type: 'system', payload: { message: 'Bienvenido al sistema de salas' } })
	)

	// Send current rooms list
	ws.send(JSON.stringify({
		type: 'rooms-list',
		payload: { rooms: getRoomsList() }
	}))

	ws.on('message', (raw) => {
		console.log('Received message from client')
		let msg
		try {
			msg = JSON.parse(raw)
		} catch (e) {
			msg = { type: 'text', payload: raw.toString() }
		}

		// Handle room creation
		if (msg.type === 'create-room') {
			const roomId = msg.payload.roomName || generateRoomId()
			const userId = msg.payload.userId || Date.now().toString()
			const username = msg.payload.username || 'Usuario'

			// Check if room name already exists
			if (rooms.has(roomId)) {
				ws.send(JSON.stringify({
					type: 'error',
					payload: { message: 'Ya existe una sala con ese nombre' }
				}))
				return
			}

			rooms.set(roomId, {
				users: [{ ws, userId, username }],
				maxUsers: 2
			})
			userToRoom.set(ws, roomId)

			ws.send(JSON.stringify({
				type: 'room-created',
				payload: { roomId, userId, username }
			}))

			console.log(`Room ${roomId} created by ${username}`)
			broadcastRoomsList()
			notifyRoomUsers(roomId)
			return
		}

		// Handle joining room
		if (msg.type === 'join-room') {
			const roomId = msg.payload.roomId
			const userId = msg.payload.userId || Date.now().toString()
			const username = msg.payload.username || 'Usuario'
			const room = rooms.get(roomId)

			if (!room) {
				ws.send(JSON.stringify({
					type: 'error',
					payload: { message: 'La sala no existe' }
				}))
				return
			}

			if (room.users.length >= room.maxUsers) {
				ws.send(JSON.stringify({
					type: 'error',
					payload: { message: 'La sala está llena' }
				}))
				return
			}

			room.users.push({ ws, userId, username })
			userToRoom.set(ws, roomId)

			ws.send(JSON.stringify({
				type: 'room-joined',
				payload: { roomId, userId, username }
			}))

			// Notify all users in the room
			room.users.forEach(user => {
				if (user.ws !== ws && user.ws.readyState === WebSocket.OPEN) {
					user.ws.send(JSON.stringify({
						type: 'user-joined',
						payload: { userId, username, roomId }
					}))
				}
			})

			console.log(`${username} joined room ${roomId}`)
			broadcastRoomsList()
			notifyRoomUsers(roomId)
			return
		}

		// Handle leaving room
		if (msg.type === 'leave-room') {
			const roomId = userToRoom.get(ws)
			if (!roomId) return

			const room = rooms.get(roomId)
			if (!room) return

			const userIndex = room.users.findIndex(u => u.ws === ws)
			if (userIndex !== -1) {
				const user = room.users[userIndex]
				room.users.splice(userIndex, 1)
				userToRoom.delete(ws)

				// Notify other users
				room.users.forEach(u => {
					if (u.ws.readyState === WebSocket.OPEN) {
						u.ws.send(JSON.stringify({
							type: 'user-left',
							payload: { userId: user.userId, username: user.username, roomId }
						}))
					}
				})

				// Delete room if empty
				if (room.users.length === 0) {
					rooms.delete(roomId)
					console.log(`Room ${roomId} deleted (empty)`)
				} else {
					notifyRoomUsers(roomId)
				}

				ws.send(JSON.stringify({
					type: 'room-left',
					payload: { roomId }
				}))

				broadcastRoomsList()
			}
			return
		}

		// Handle chat messages (only within room)
		if (msg.type === 'chat' || msg.type === 'file') {
			const roomId = userToRoom.get(ws)
			if (!roomId) {
				ws.send(JSON.stringify({
					type: 'error',
					payload: { message: 'No estás en ninguna sala' }
				}))
				return
			}

			const room = rooms.get(roomId)
			if (!room) return

			const sender = room.users.find(u => u.ws === ws)
			if (!sender) return

			// Determine broadcast structure based on message type
			let broadcast
			if (msg.type === 'file') {
				broadcast = JSON.stringify({
					type: 'broadcast',
					messageType: 'file',
					payload: {
						from: sender.username,
						userId: sender.userId,
						fileName: msg.payload.fileName,
						fileSize: msg.payload.fileSize,
						fileType: msg.payload.fileType,
						fileData: msg.payload.fileData,
						receivedAt: Date.now(),
						roomId
					},
				})
			} else {
				// Handle text messages properly
				let messageText = ''
				if (typeof msg.payload === 'string') {
					messageText = msg.payload
				} else if (msg.payload && msg.payload.text) {
					messageText = msg.payload.text
				} else if (msg.payload && msg.payload.message) {
					messageText = msg.payload.message
				} else {
					messageText = String(msg.payload)
				}

				broadcast = JSON.stringify({
					type: 'broadcast',
					messageType: 'text',
					payload: {
						from: sender.username,
						userId: sender.userId,
						message: messageText,
						text: messageText,
						receivedAt: Date.now(),
						roomId
					},
				})
			}

			// Send only to users in the same room
			room.users.forEach((user) => {
				if (user.ws.readyState === WebSocket.OPEN) {
					user.ws.send(broadcast)
				}
			})
		}
	})

	ws.on('close', () => {
		console.log('Client disconnected')
		
		// Remove user from room
		const roomId = userToRoom.get(ws)
		if (roomId) {
			const room = rooms.get(roomId)
			if (room) {
				const userIndex = room.users.findIndex(u => u.ws === ws)
				if (userIndex !== -1) {
					const user = room.users[userIndex]
					room.users.splice(userIndex, 1)
					
					// Notify other users
					room.users.forEach(u => {
						if (u.ws.readyState === WebSocket.OPEN) {
							u.ws.send(JSON.stringify({
								type: 'user-left',
								payload: { userId: user.userId, username: user.username, roomId }
							}))
						}
					})

					// Delete room if empty
					if (room.users.length === 0) {
						rooms.delete(roomId)
						console.log(`Room ${roomId} deleted (empty)`)
					} else {
						notifyRoomUsers(roomId)
					}
				}
			}
			userToRoom.delete(ws)
			broadcastRoomsList()
		}
	})

	ws.on('error', (err) => {
		console.error('WS Error:', err)
	})
})
