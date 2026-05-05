// backend/src/modules/chat/chat.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { LocationsService } from '../locations/locations.service';

@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, string>(); // userId -> socketId

  constructor(
    private jwtService: JwtService,
    private chatService: ChatService,
    private locationsService: LocationsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
      this.userSockets.set(payload.sub, client.id);

      // Join user's personal room
      client.join(`user:${payload.sub}`);

      // Broadcast online status
      this.server.emit('user:online', { userId: payload.sub });
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.userId) {
      this.userSockets.delete(client.data.userId);
      this.server.emit('user:offline', { userId: client.data.userId });
    }
  }

  @SubscribeMessage('message:send')
  async handleMessage(
    client: Socket,
    payload: { recipientId: string; content: string; type: 'text' | 'image' | 'location' },
  ) {
    const senderId = client.data.userId;

    // Persist message
    const message = await this.chatService.createMessage({
      senderId,
      recipientId: payload.recipientId,
      content: payload.content,
      type: payload.type,
    });

    // Emit to recipient if online
    this.server.to(`user:${payload.recipientId}`).emit('message:receive', message);

    // Confirm to sender
    return { success: true, message };
  }

  @SubscribeMessage('location:update')
  async handleLocationUpdate(
    client: Socket,
    payload: { lat: number; lng: number },
  ) {
    const userId = client.data.userId;
    await this.locationsService.updateLocation(userId, payload.lat, payload.lng);

    // Broadcast to nearby users (within 1km)
    const nearbyUsers = await this.locationsService.findNearbyUsers(
      userId, payload.lat, payload.lng, 1,
    );

    nearbyUsers.forEach(user => {
      this.server.to(`user:${user.id}`).emit('nearby:update', {
        userId,
        lat: payload.lat,
        lng: payload.lng,
      });
    });
  }

  // Emit wave notification to a specific user
  emitWaveToUser(toUserId: string, wave: {
    id: string;
    fromUserId: string;
    fromUserName: string;
    fromUserAvatar?: string;
    createdAt: Date;
  }) {
    this.server.to(`user:${toUserId}`).emit('wave:receive', wave);
  }
}
