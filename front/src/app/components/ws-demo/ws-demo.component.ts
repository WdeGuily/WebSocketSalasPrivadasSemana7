import { Component, OnInit, OnDestroy } from '@angular/core'
import { WebsocketService, WSMessage, Room } from '../../services/websocket.service'
import { Subscription } from 'rxjs'

@Component({
	selector: 'app-ws-demo',
	template: `
		<!-- Room Selection Screen -->
		<div *ngIf="!currentRoom" class="h-screen max-w-4xl mx-auto flex flex-col bg-white shadow-xl">
			<!-- Header -->
			<div class="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 shadow-sm flex-shrink-0">
				<h2 class="text-lg sm:text-xl font-semibold text-gray-900">Salas de Chat</h2>
				<div class="flex items-center gap-2 mt-2">
					<div
						class="w-2 h-2 rounded-full transition-colors"
						[ngClass]="connected ? 'bg-green-500' : 'bg-red-500'"></div>
					<span class="text-sm text-gray-600">{{
						connected ? 'Conectado' : 'Desconectado'
					}}</span>
				</div>
			</div>

			<!-- Content -->
			<div class="flex-1 overflow-y-auto p-6">
				<!-- Create Room Section -->
				<div class="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
					<h3 class="text-lg font-semibold text-gray-900 mb-4">Crear Nueva Sala</h3>
					<div class="flex flex-col gap-3">
						<input
							[(ngModel)]="username"
							placeholder="Tu nombre..."
							class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm" />
						<input
							[(ngModel)]="roomName"
							placeholder="Nombre de la sala (opcional)..."
							class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
							(keydown.enter)="createRoom()" />
						<button
							(click)="createRoom()"
							[disabled]="!username.trim()"
							class="w-full sm:w-auto px-6 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors">
							Crear Sala
						</button>
					</div>
				</div>

				<!-- Available Rooms -->
				<div>
					<h3 class="text-lg font-semibold text-gray-900 mb-4">Salas Disponibles</h3>
					
					<div *ngIf="availableRooms.length === 0" class="text-center py-12 text-gray-500">
						<div class="text-6xl mb-4 opacity-50">🚪</div>
						<p class="text-lg">No hay salas disponibles</p>
						<small class="text-sm">Crea una nueva sala para comenzar</small>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div
							*ngFor="let room of availableRooms"
							class="border-2 rounded-lg p-4 transition-all"
							[ngClass]="room.isFull ? 'border-gray-300 bg-gray-50' : 'border-green-300 bg-green-50 hover:shadow-md cursor-pointer'"
							(click)="!room.isFull && showJoinDialog(room)">
							<div class="flex justify-between items-start mb-3">
								<div class="font-bold text-gray-900 text-lg">Sala {{ room.roomId }}</div>
								<div
									class="px-3 py-1 rounded-full text-xs font-medium"
									[ngClass]="room.isFull ? 'bg-red-500 text-white' : 'bg-green-500 text-white'">
									{{ room.userCount }}/{{ room.maxUsers }}
								</div>
							</div>

							<div class="space-y-2 mb-3">
								<div *ngFor="let user of room.users" class="flex items-center gap-2 text-sm text-gray-700">
									<span class="w-2 h-2 bg-green-500 rounded-full"></span>
									<span>{{ user.username }}</span>
								</div>
							</div>

							<button
								*ngIf="!room.isFull"
								class="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
								Unirse a la Sala
							</button>
							<div *ngIf="room.isFull" class="w-full bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium text-center">
								Sala Llena
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Join Dialog -->
		<div
			*ngIf="showJoinPrompt"
			class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
			(click)="cancelJoin()">
			<div class="bg-white rounded-lg p-6 max-w-md w-full mx-4" (click)="$event.stopPropagation()">
				<h3 class="text-xl font-semibold text-gray-900 mb-4">Unirse a Sala {{ selectedRoom?.roomId }}</h3>
				<input
					[(ngModel)]="username"
					placeholder="Tu nombre..."
					class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm mb-4"
					(keydown.enter)="confirmJoin()" />
				<div class="flex gap-3">
					<button
						(click)="cancelJoin()"
						class="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
						Cancelar
					</button>
					<button
						(click)="confirmJoin()"
						[disabled]="!username.trim()"
						class="flex-1 px-4 py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors">
						Unirse
					</button>
				</div>
			</div>
		</div>

		<!-- Chat Screen -->
		<div *ngIf="currentRoom" class="h-screen max-w-4xl mx-auto flex flex-col bg-white shadow-xl">
			<!-- Header -->
			<div
				class="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 shadow-sm flex-shrink-0">
				<div class="flex justify-between items-center">
					<div>
						<h2 class="text-lg sm:text-xl font-semibold text-gray-900">Sala {{ currentRoom }}</h2>
						<div class="flex items-center gap-4 mt-1">
							<div class="flex items-center gap-2">
								<div
									class="w-2 h-2 rounded-full transition-colors"
									[ngClass]="connected ? 'bg-green-500' : 'bg-red-500'"></div>
								<span class="text-sm text-gray-600">{{
									connected ? 'Conectado' : 'Desconectado'
								}}</span>
							</div>
							<span class="text-sm text-gray-600">{{ roomUsers.length }}/2 usuarios</span>
						</div>
					</div>
					<button
						(click)="leaveRoom()"
						class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors">
						Salir
					</button>
				</div>

				<!-- Room Users -->
				<div class="mt-3 flex gap-2">
					<div
						*ngFor="let user of roomUsers"
						class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
						{{ user.username }}
					</div>
				</div>
			</div>

			<!-- Messages Container -->
			<div class="flex-1 overflow-hidden flex flex-col min-h-0">
				<div
					*ngIf="messages.length === 0"
					class="flex-1 flex flex-col items-center justify-center text-gray-500">
					<div class="text-6xl mb-4 opacity-50">💬</div>
					<p class="text-lg">No hay mensajes aún</p>
					<small class="text-sm">Envía un mensaje para comenzar la conversación</small>
				</div>

				<div
					class="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3 flex flex-col-reverse"
					style="-webkit-overflow-scrolling: touch;">
					<div *ngFor="let m of messages; trackBy: trackByIndex">
						<!-- System Message -->
						<div
							*ngIf="isSystemMessage(m)"
							class="text-center py-2">
							<span class="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
								{{ getMessageText(m) }}
							</span>
						</div>

						<!-- Text Message -->
						<div
							*ngIf="isTextMessage(m) && !isSystemMessage(m)"
							class="bg-white rounded-lg shadow-sm border border-gray-100 p-3 sm:p-4">
							<div class="flex items-start gap-2 mb-2">
								<span class="font-semibold text-blue-600 text-sm">{{ m.payload?.from || 'Usuario' }}</span>
								<span class="text-xs text-gray-500 mt-0.5">
									{{ formatTime(m.payload?.receivedAt || m.payload?.ts) }}
								</span>
							</div>
							<div class="text-gray-900 text-sm sm:text-base break-words">
								{{ getMessageText(m) }}
							</div>
						</div>

						<!-- File Message -->
						<div
							*ngIf="isFileMessage(m)"
							class="bg-white rounded-lg shadow-sm border border-gray-100 p-3 sm:p-4">
							<div class="flex items-center gap-2 mb-2">
								<span class="font-semibold text-blue-600 text-sm">{{ m.payload?.from || 'Usuario' }}</span>
								<span class="text-xs text-gray-500">{{
									formatTime(m.payload?.receivedAt)
								}}</span>
							</div>
							<div class="flex items-center gap-2 mb-3 text-sm text-gray-600">
								<span class="text-lg">{{ getFileIcon(m.payload?.fileType) }}</span>
								<span class="font-medium">
									{{ isImage(m.payload?.fileType) ? 'Imagen' : 'Archivo' }}
								</span>
							</div>

							<div class="flex flex-col sm:flex-row gap-3">
								<!-- File Preview -->
								<div class="flex justify-center sm:justify-start flex-shrink-0">
									<div
										*ngIf="isImage(m.payload?.fileType); else fileIconDisplay"
										class="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform">
										<img
											[src]="getImageDataUrl(m.payload)"
											[alt]="m.payload?.fileName"
											(click)="viewImage(m.payload)"
											class="w-full h-full object-cover" />
									</div>
									<ng-template #fileIconDisplay>
										<div
											class="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-lg flex items-center justify-center">
											<span class="text-2xl">{{ getFileIcon(m.payload?.fileType) }}</span>
										</div>
									</ng-template>
								</div>

								<!-- File Info -->
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2 mb-2">
										<span class="font-medium text-gray-900 truncate">
											{{ getFileNameWithoutExtension(m.payload?.fileName) }}
										</span>
										<span
											class="bg-blue-500 text-white px-2 py-0.5 rounded-full text-xs font-medium">
											.{{ getFileExtension(m.payload?.fileName) }}
										</span>
									</div>

									<div class="flex gap-4 mb-3 text-xs text-gray-600">
										<span>{{ formatFileSize(m.payload?.fileSize) }}</span>
										<span>{{ getFileTypeDisplay(m.payload?.fileType) }}</span>
									</div>

									<div class="flex flex-wrap gap-2">
										<button
											(click)="downloadFile(m.payload)"
											class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors">
											↓ Descargar
										</button>
										<button
											*ngIf="isImage(m.payload?.fileType)"
											(click)="viewImage(m.payload)"
											class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors">
											👁 Ver
										</button>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Input Section -->
			<div class="bg-white border-t border-gray-200 p-4 sm:p-6 flex-shrink-0 space-y-4">
				<!-- Warning if room not full -->
				<div *ngIf="roomUsers.length < 2" class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
					⏳ Esperando a que otro usuario se una a la sala...
				</div>

				<!-- Text Message Input -->
				<div class="flex gap-2">
					<input
						[(ngModel)]="outMsg"
						placeholder="Escribe tu mensaje..."
						[disabled]="roomUsers.length < 2"
						class="flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm disabled:bg-gray-100"
						(keydown.enter)="send()" />
					<button
						(click)="send()"
						[disabled]="!outMsg.trim() || roomUsers.length < 2"
						class="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-full flex items-center justify-center transition-all hover:scale-105 disabled:hover:scale-100">
						<span class="text-lg font-bold">→</span>
					</button>
				</div>

				<!-- File Input -->
				<div class="flex flex-wrap items-center gap-2">
					<input
						type="file"
						#fileInput
						(change)="onFileSelected($event)"
						[disabled]="roomUsers.length < 2"
						class="hidden"
						id="file-input" />
					<label
						for="file-input"
						[class.opacity-50]="roomUsers.length < 2"
						[class.cursor-not-allowed]="roomUsers.length < 2"
						[class.cursor-pointer]="roomUsers.length >= 2"
						class="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm text-gray-700 transition-colors">
						<span class="text-lg">📎</span>
						<span class="hidden sm:inline">Adjuntar archivo</span>
					</label>
					<button
						*ngIf="selectedFile"
						(click)="sendFile()"
						[disabled]="roomUsers.length < 2"
						class="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
						Enviar archivo
					</button>
				</div>

				<!-- File Preview -->
				<div
					*ngIf="selectedFile"
					class="bg-gray-50 border border-gray-200 rounded-lg p-4">
					<div class="flex items-center gap-4">
						<div class="flex-shrink-0">
							<div
								*ngIf="isImage(selectedFile.type); else fileIconTemplate"
								class="w-12 h-12 rounded-lg overflow-hidden">
								<img
									[src]="getSelectedFilePreview()"
									[alt]="selectedFile.name"
									class="w-full h-full object-cover" />
							</div>
							<ng-template #fileIconTemplate>
								<div
									class="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
									<span class="text-xl">{{ getFileIcon(selectedFile.type) }}</span>
								</div>
							</ng-template>
						</div>
						<div class="flex-1 min-w-0">
							<div class="font-medium text-gray-900 truncate">
								{{ selectedFile.name }}
							</div>
							<div class="text-sm text-gray-600">
								{{ formatFileSize(selectedFile.size) }} •
								{{ getFileTypeDisplay(selectedFile.type) }}
							</div>
						</div>
						<button
							(click)="clearSelectedFile()"
							class="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-sm transition-colors">
							×
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Image Modal -->
		<div
			*ngIf="modalImageUrl"
			class="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 backdrop-blur-sm"
			(click)="closeModal()">
			<div class="relative max-w-[90vw] max-h-[90vh]">
				<img
					[src]="modalImageUrl"
					[alt]="modalImageName"
					(click)="$event.stopPropagation()"
					class="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
				<button
					(click)="closeModal()"
					class="absolute -top-10 -right-10 w-8 h-8 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-800 transition-colors">
					×
				</button>
			</div>
		</div>
	`,
	styles: [],
})
export class WsDemoComponent implements OnInit, OnDestroy {
	messages: WSMessage[] = []
	outMsg = ''
	connected = false
	selectedFile: File | null = null
	selectedFilePreviewUrl: string = ''
	modalImageUrl: string = ''
	modalImageName: string = ''
	
	// Room management
	currentRoom: string = ''
	username: string = ''
	roomName: string = ''
	availableRooms: Room[] = []
	roomUsers: { userId: string; username: string }[] = []
	showJoinPrompt: boolean = false
	selectedRoom: Room | null = null
	
	private subMsg?: Subscription
	private subStatus?: Subscription

	constructor(private ws: WebsocketService) {}

	ngOnInit(): void {
		this.subMsg = this.ws.messages$().subscribe((msg) => {
			// Handle different message types
			switch (msg.type) {
				case 'rooms-list':
					this.availableRooms = msg.payload.rooms || []
					break
				
				case 'room-created':
					this.currentRoom = msg.payload.roomId
					this.messages = []
					break
				
				case 'room-joined':
					this.currentRoom = msg.payload.roomId
					this.messages = []
					this.showJoinPrompt = false
					break
				
				case 'room-left':
					this.currentRoom = ''
					this.messages = []
					this.roomUsers = []
					break
				
				case 'room-users':
					if (msg.payload.roomId === this.currentRoom) {
						this.roomUsers = msg.payload.users || []
					}
					break
				
				case 'user-joined':
					if (msg.payload.roomId === this.currentRoom) {
						this.messages.unshift({
							type: 'system',
							payload: { 
								message: `${msg.payload.username} se unió a la sala`,
								receivedAt: Date.now()
							}
						})
					}
					break
				
				case 'user-left':
					if (msg.payload.roomId === this.currentRoom) {
						this.messages.unshift({
							type: 'system',
							payload: { 
								message: `${msg.payload.username} salió de la sala`,
								receivedAt: Date.now()
							}
						})
					}
					break
				
				case 'broadcast':
					if (msg.payload.roomId === this.currentRoom) {
						this.messages.unshift(msg)
					}
					break
				
				case 'error':
					alert(msg.payload.message)
					break
				
				default:
					// Other messages
					if (msg.type !== 'system') {
						this.messages.unshift(msg)
					}
					break
			}
		})

		this.subStatus = this.ws.status$().subscribe((state) => {
			this.connected = state
		})
	}

	createRoom() {
		if (!this.username.trim()) return
		this.ws.createRoom(this.username.trim(), this.roomName.trim() || undefined)
		this.roomName = '' // Clear room name input after creating
	}

	showJoinDialog(room: Room) {
		if (room.isFull) return
		this.selectedRoom = room
		this.showJoinPrompt = true
	}

	confirmJoin() {
		if (!this.username.trim() || !this.selectedRoom) return
		this.ws.joinRoom(this.selectedRoom.roomId, this.username.trim())
	}

	cancelJoin() {
		this.showJoinPrompt = false
		this.selectedRoom = null
	}

	leaveRoom() {
		this.ws.leaveRoom()
	}

	send() {
		if (!this.outMsg) return
		const message: WSMessage = {
			type: 'chat',
			payload: { text: this.outMsg, ts: Date.now() },
		}
		this.ws.send(message)
		this.outMsg = ''
	}

	disconnect() {
		this.ws.close()
	}

	onFileSelected(event: any) {
		const file = event.target.files[0]
		if (file) {
			this.selectedFile = file

			// Generate preview URL for images
			if (this.isImage(file.type)) {
				const reader = new FileReader()
				reader.onload = (e) => {
					this.selectedFilePreviewUrl = e.target?.result as string
				}
				reader.readAsDataURL(file)
			} else {
				this.selectedFilePreviewUrl = ''
			}
		}
	}

	getSelectedFilePreview(): string {
		return this.selectedFilePreviewUrl
	}

	sendFile() {
		if (!this.selectedFile) return

		const reader = new FileReader()
		reader.onload = (e) => {
			const fileData = e.target?.result as string
			const base64Data = fileData.split(',')[1] // Remove data:type;base64, prefix

			const fileMessage: WSMessage = {
				type: 'file',
				payload: {
					fileName: this.selectedFile!.name,
					fileSize: this.selectedFile!.size,
					fileType: this.selectedFile!.type,
					fileData: base64Data,
				},
			}

			this.ws.send(fileMessage)
			this.selectedFile = null
			this.selectedFilePreviewUrl = ''
			// Reset file input
			const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
			if (fileInput) fileInput.value = ''
		}
		reader.readAsDataURL(this.selectedFile)
	}

	isTextMessage(message: WSMessage): boolean {
		return (
			!message.messageType ||
			message.messageType === 'text' ||
			message.type === 'chat' ||
			message.type === 'system' ||
			message.type === 'broadcast' && message.messageType === 'text'
		)
	}
	
	isSystemMessage(message: WSMessage): boolean {
		return message.type === 'system'
	}

	isFileMessage(message: WSMessage): boolean {
		return message.messageType === 'file'
	}

	formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 Bytes'
		const k = 1024
		const sizes = ['Bytes', 'KB', 'MB', 'GB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
	}

	formatTime(timestamp: number): string {
		if (!timestamp) return ''
		const date = new Date(timestamp)
		return date.toLocaleTimeString()
	}

	downloadFile(filePayload: any) {
		if (!filePayload?.fileData) return

		// Create a blob from base64 data
		const byteCharacters = atob(filePayload.fileData)
		const byteNumbers = new Array(byteCharacters.length)
		for (let i = 0; i < byteCharacters.length; i++) {
			byteNumbers[i] = byteCharacters.charCodeAt(i)
		}
		const byteArray = new Uint8Array(byteNumbers)
		const blob = new Blob([byteArray], { type: filePayload.fileType })

		// Create download link
		const url = window.URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = url
		link.download = filePayload.fileName
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
		window.URL.revokeObjectURL(url)
	}

	// Image handling methods
	isImage(fileType: string): boolean {
		if (!fileType) return false
		return fileType.startsWith('image/')
	}

	getImageDataUrl(filePayload: any): string {
		if (!filePayload?.fileData || !filePayload?.fileType) return ''
		return `data:${filePayload.fileType};base64,${filePayload.fileData}`
	}

	viewImage(filePayload: any) {
		if (!this.isImage(filePayload?.fileType)) return

		this.modalImageUrl = this.getImageDataUrl(filePayload)
		this.modalImageName = filePayload.fileName || 'Imagen'
	}

	closeModal() {
		this.modalImageUrl = ''
		this.modalImageName = ''
	}

	// File type icon and display methods
	getFileIcon(fileType: string): string {
		if (!fileType) return '📄'

		if (fileType.startsWith('image/')) return '🖼️'
		if (fileType.startsWith('video/')) return '🎥'
		if (fileType.startsWith('audio/')) return '🎵'
		if (fileType.includes('pdf')) return '📕'
		if (fileType.includes('word') || fileType.includes('document')) return '📘'
		if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊'
		if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📽️'
		if (
			fileType.includes('zip') ||
			fileType.includes('rar') ||
			fileType.includes('compressed')
		)
			return '🗜️'
		if (fileType.includes('text')) return '📝'
		if (
			fileType.includes('json') ||
			fileType.includes('javascript') ||
			fileType.includes('html') ||
			fileType.includes('css')
		)
			return '💻'

		return '📄'
	}

	getFileTypeDisplay(fileType: string): string {
		if (!fileType) return 'Desconocido'

		const typeMap: { [key: string]: string } = {
			'image/jpeg': 'JPEG Image',
			'image/jpg': 'JPG Image',
			'image/png': 'PNG Image',
			'image/gif': 'GIF Image',
			'image/webp': 'WebP Image',
			'video/mp4': 'MP4 Video',
			'video/avi': 'AVI Video',
			'audio/mp3': 'MP3 Audio',
			'audio/wav': 'WAV Audio',
			'application/pdf': 'PDF Document',
			'application/msword': 'Word Document',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
				'Word Document',
			'application/vnd.ms-excel': 'Excel Spreadsheet',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
				'Excel Spreadsheet',
			'text/plain': 'Text File',
			'application/json': 'JSON File',
			'text/html': 'HTML File',
			'text/css': 'CSS File',
			'application/javascript': 'JavaScript File',
			'application/zip': 'ZIP Archive',
			'application/x-rar-compressed': 'RAR Archive',
		}

		return typeMap[fileType] || fileType.split('/').pop()?.toUpperCase() || 'Archivo'
	}

	getFileExtension(fileName: string): string {
		if (!fileName) return ''
		const extension = fileName.split('.').pop()
		return extension ? extension.toUpperCase() : ''
	}

	getFileNameWithoutExtension(fileName: string): string {
		if (!fileName) return ''
		const parts = fileName.split('.')
		if (parts.length === 1) return fileName
		return parts.slice(0, -1).join('.')
	}

	getMessageText(message: WSMessage): string {
		if (!message.payload) return 'Mensaje vacío'

		// Si es string directamente
		if (typeof message.payload === 'string') {
			return message.payload
		}

		// Si es objeto, buscar propiedades comunes
		if (typeof message.payload === 'object' && message.payload !== null) {
			if (message.payload.message) {
				return String(message.payload.message)
			}

			if (message.payload.text) {
				return String(message.payload.text)
			}

			return JSON.stringify(message.payload, null, 2)
		}

		// Fallback
		return String(message.payload)
	}

	clearSelectedFile() {
		this.selectedFile = null
		this.selectedFilePreviewUrl = ''
		const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
		if (fileInput) fileInput.value = ''
	}

	trackByIndex(index: number, item: WSMessage): number {
		return index
	}
	ngOnDestroy(): void {
		if (this.subMsg) this.subMsg.unsubscribe()
		if (this.subStatus) this.subStatus.unsubscribe()
	}
}
