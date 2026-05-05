import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation, ConversationType } from './entities/conversation.entity';
import { Message, MessageType, MessageStatus } from './entities/message.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private conversationsRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private messagesRepo: Repository<Message>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {}

  // ─── Get or Create Direct Conversation ────────────────────────────────

  async getOrCreateConversation(
    user1Id: string,
    user2Id: string,
  ): Promise<Conversation> {
    // Check for existing conversation
    let conversation = await this.conversationsRepo.findOne({
      where: [
        { participant1: { id: user1Id }, participant2: { id: user2Id } },
        { participant1: { id: user2Id }, participant2: { id: user1Id } },
      ],
      relations: ['participant1', 'participant2'],
    });

    if (conversation) {
      return conversation;
    }

    // Create new conversation
    const user1 = await this.usersRepo.findOne({ where: { id: user1Id } });
    const user2 = await this.usersRepo.findOne({ where: { id: user2Id } });

    conversation = this.conversationsRepo.create({
      type: ConversationType.DIRECT,
      participant1: user1 ?? undefined,
      participant2: user2 ?? undefined,
    } as Partial<Conversation>);

    return this.conversationsRepo.save(conversation);
  }

  // ─── Get User Conversations ───────────────────────────────────────────

  async getUserConversations(userId: string): Promise<Conversation[]> {
    return this.conversationsRepo
      .createQueryBuilder('conv')
      .leftJoinAndSelect('conv.participant1', 'p1')
      .leftJoinAndSelect('conv.participant2', 'p2')
      .where('conv.participant1Id = :userId OR conv.participant2Id = :userId', { userId })
      .orderBy('conv.lastMessageAt', 'DESC', 'NULLS LAST')
      .getMany();
  }

  // ─── Get Conversation Messages ────────────────────────────────────────

  async getMessages(
    conversationId: string,
    limit: number = 50,
    beforeId?: string,
  ): Promise<Message[]> {
    const query = this.messagesRepo
      .createQueryBuilder('msg')
      .leftJoinAndSelect('msg.sender', 'sender')
      .where('msg.conversationId = :conversationId', { conversationId })
      .andWhere('msg.isDeleted = :deleted', { deleted: false })
      .orderBy('msg.createdAt', 'DESC')
      .take(limit);

    if (beforeId) {
      const beforeMessage = await this.messagesRepo.findOne({ where: { id: beforeId } });
      if (beforeMessage) {
        query.andWhere('msg.createdAt < :beforeTime', { beforeTime: beforeMessage.createdAt });
      }
    }

    const messages = await query.getMany();
    return messages.reverse(); // Return in chronological order
  }

  // ─── Send Message ─────────────────────────────────────────────────────

  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    type: MessageType = MessageType.TEXT,
    metadata?: any,
  ): Promise<Message> {
    const sender = await this.usersRepo.findOne({ where: { id: senderId } });
    const conversation = await this.conversationsRepo.findOne({
      where: { id: conversationId },
    });

    const message = this.messagesRepo.create({
      conversation: conversation ?? undefined,
      sender: sender ?? undefined,
      content,
      type,
      metadata,
      status: MessageStatus.SENT,
    } as Partial<Message>);

    await this.messagesRepo.save(message);

    // Update conversation last message
    await this.conversationsRepo.update(conversationId, {
      lastMessageText: content,
      lastMessageAt: new Date(),
    });

    return message;
  }

  // ─── Mark Messages as Read ────────────────────────────────────────────

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    await this.messagesRepo
      .createQueryBuilder()
      .update(Message)
      .set({
        status: MessageStatus.READ,
        readAt: new Date(),
      })
      .where('conversationId = :conversationId', { conversationId })
      .andWhere('senderId != :userId', { userId })
      .andWhere('status != :status', { status: MessageStatus.READ })
      .execute();
  }

  // ─── Create Message (wrapper for sendMessage) ─────────────────────────

  async createMessage(data: {
    senderId: string;
    recipientId: string;
    content: string;
    type: 'text' | 'image' | 'location';
  }): Promise<Message> {
    const conversation = await this.getOrCreateConversation(data.senderId, data.recipientId);
    const messageType = data.type === 'text' ? MessageType.TEXT : data.type === 'image' ? MessageType.IMAGE : MessageType.LOCATION;
    return this.sendMessage(conversation.id, data.senderId, data.content, messageType);
  }
}
