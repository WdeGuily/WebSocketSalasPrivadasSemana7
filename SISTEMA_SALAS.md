# Sistema de Salas - Chat WebSocket

## 🎯 Descripción

El proyecto ahora incluye un sistema de salas que permite la comunicación privada entre 2 usuarios. Los mensajes solo se envían y reciben dentro de cada sala específica.

## ✨ Características Implementadas

### Backend (Node.js + WebSocket)

- **Gestión de Salas**: Sistema completo de creación y administración de salas
- **Límite de Usuarios**: Cada sala acepta máximo 2 usuarios
- **Mensajería Privada**: Los mensajes solo se transmiten entre usuarios de la misma sala
- **Identificación de Usuarios**: Cada usuario tiene un ID único y nombre de usuario
- **Notificaciones en Tiempo Real**: Actualización instantánea cuando usuarios se unen o salen

### Frontend (Angular 17)

#### Pantalla de Selección de Salas
- **Crear Nueva Sala**: Botón para crear una sala nueva con tu nombre
- **Lista de Salas Disponibles**: Muestra todas las salas activas
- **Información de Sala**: 
  - ID de la sala
  - Usuarios conectados en la sala
  - Estado (disponible/llena)
  - Contador de usuarios (X/2)

#### Pantalla de Chat
- **Cabecera con Información**:
  - Nombre de la sala
  - Lista de usuarios conectados
  - Contador de usuarios
  - Botón para salir de la sala
- **Mensajes con Usuario**: Cada mensaje muestra quién lo envió
- **Mensajes del Sistema**: Notificaciones cuando alguien se une o sale
- **Advertencia**: Aviso cuando falta el segundo usuario
- **Input Bloqueado**: Los mensajes solo se pueden enviar cuando hay 2 usuarios

## 🚀 Cómo Usar

### 1. Iniciar los Servidores

```powershell
# Terminal 1 - Backend
cd back
npm start

# Terminal 2 - Frontend
cd front
npm start
```

### 2. Crear o Unirse a una Sala

1. Abre dos navegadores o ventanas incógnito
2. En la primera ventana:
   - Ingresa tu nombre
   - Haz clic en "Crear Sala"
   - Espera a que otro usuario se una
3. En la segunda ventana:
   - Ingresa tu nombre
   - Haz clic en la sala disponible
   - Haz clic en "Unirse a la Sala"

### 3. Chatear

- Una vez que ambos usuarios estén en la sala, podrán:
  - Enviar mensajes de texto
  - Compartir archivos e imágenes
  - Ver los mensajes en tiempo real
  - Los mensajes solo son visibles para los 2 usuarios de esa sala

## 🔧 Estructura de Mensajes WebSocket

### Crear Sala
```json
{
  "type": "create-room",
  "payload": {
    "username": "Juan",
    "userId": "user_123456"
  }
}
```

### Unirse a Sala
```json
{
  "type": "join-room",
  "payload": {
    "roomId": "ABC123",
    "username": "María",
    "userId": "user_789012"
  }
}
```

### Salir de Sala
```json
{
  "type": "leave-room",
  "payload": {}
}
```

### Mensaje de Chat
```json
{
  "type": "chat",
  "payload": {
    "text": "Hola!",
    "ts": 1234567890
  }
}
```

### Enviar Archivo
```json
{
  "type": "file",
  "payload": {
    "fileName": "imagen.png",
    "fileSize": 12345,
    "fileType": "image/png",
    "fileData": "base64data..."
  }
}
```

## 📡 Eventos del Servidor

- `rooms-list`: Lista actualizada de todas las salas
- `room-created`: Confirmación de creación de sala
- `room-joined`: Confirmación de unión a sala
- `room-left`: Confirmación de salida de sala
- `room-users`: Lista de usuarios en la sala
- `user-joined`: Notificación cuando un usuario se une
- `user-left`: Notificación cuando un usuario sale
- `broadcast`: Mensaje o archivo enviado en la sala
- `error`: Mensaje de error

## 🎨 Características Visuales

- **Indicadores de Estado**: Colores para mostrar salas disponibles/llenas
- **Badges de Usuarios**: Muestra los nombres de usuarios conectados
- **Mensajes del Sistema**: Estilo diferenciado para notificaciones
- **Responsive**: Diseño adaptable a diferentes tamaños de pantalla
- **Animaciones**: Transiciones suaves para mejor UX

## 🔒 Seguridad y Validaciones

- Validación de sala llena antes de unirse
- Validación de sala existente
- Solo se pueden enviar mensajes dentro de una sala
- Limpieza automática de salas vacías
- Desconexión limpia al cerrar el navegador

## 🐛 Manejo de Errores

- Mensajes de error cuando la sala no existe
- Alerta cuando la sala está llena
- Notificación si no estás en ninguna sala al enviar mensaje
- Reconexión automática del WebSocket

## 💡 Posibles Mejoras Futuras

- [ ] Agregar salas con más de 2 usuarios
- [ ] Historial de mensajes persistente
- [ ] Contraseñas para salas privadas
- [ ] Lista de usuarios en línea
- [ ] Typing indicators (indicador de "está escribiendo...")
- [ ] Reacciones a mensajes
- [ ] Mensajes de voz
- [ ] Videollamadas

## 📝 Notas Técnicas

- El servidor mantiene un mapa de salas en memoria
- Cada conexión WebSocket se asocia a una sala
- Las salas se eliminan automáticamente cuando quedan vacías
- Los IDs de sala se generan aleatoriamente (6 caracteres)
- Los IDs de usuario son únicos por sesión

---

**Autor**: William Enriquez  
**Fecha**: Noviembre 2025  
**Tecnologías**: Angular 17, Node.js, WebSocket (ws)
