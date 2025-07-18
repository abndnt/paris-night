import { Pool } from 'pg';

export interface ChatSession {
  id: string;
  userId?: string;
  sessionData: any;
  lastActivity: Date;
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  messageType: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: any;
  createdAt: Date;
}

export interface CreateSessionData {
  userId?: string | undefined;
  sessionData?: any;
}

export interface CreateMessageData {
  sessionId: string;
  messageType: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: any;
}

export interface MessageIntent {
  intent: string;
  confidence: number;
  entities: { [key: string]: any };
}

export class ChatModel {
  private db: Pool;

  constructor(database: Pool) {
    this.db = database;
  }

  async createSession(sessionData: CreateSessionData): Promise<ChatSession> {
    const query = `
      INSERT INTO chat_sessions (user_id, session_data)
      VALUES ($1, $2)
      RETURNING id, user_id, session_data, last_activity, created_at
    `;

    const values = [
      sessionData.userId || null,
      JSON.stringify(sessionData.sessionData || {})
    ];

    const result = await this.db.query(query, values);
    const row = result.rows[0];

    return {
      id: row.id,
      userId: row.user_id,
      sessionData: row.session_data,
      lastActivity: row.last_activity,
      createdAt: row.created_at,
    };
  }

  async getSession(sessionId: string): Promise<ChatSession | null> {
    const query = `
      SELECT id, user_id, session_data, last_activity, created_at
      FROM chat_sessions 
      WHERE id = $1
    `;

    const result = await this.db.query(query, [sessionId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      sessionData: row.session_data,
      lastActivity: row.last_activity,
      createdAt: row.created_at,
    };
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    const query = `
      UPDATE chat_sessions 
      SET last_activity = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await this.db.query(query, [sessionId]);
  }

  async updateSessionData(sessionId: string, sessionData: any): Promise<ChatSession | null> {
    const query = `
      UPDATE chat_sessions 
      SET session_data = $2, last_activity = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, user_id, session_data, last_activity, created_at
    `;

    const result = await this.db.query(query, [sessionId, JSON.stringify(sessionData)]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      sessionData: row.session_data,
      lastActivity: row.last_activity,
      createdAt: row.created_at,
    };
  }

  async addMessage(messageData: CreateMessageData): Promise<ChatMessage> {
    const query = `
      INSERT INTO chat_messages (session_id, message_type, content, metadata)
      VALUES ($1, $2, $3, $4)
      RETURNING id, session_id, message_type, content, metadata, created_at
    `;

    const values = [
      messageData.sessionId,
      messageData.messageType,
      messageData.content,
      JSON.stringify(messageData.metadata || {})
    ];

    const result = await this.db.query(query, values);
    const row = result.rows[0];

    // Update session activity
    await this.updateSessionActivity(messageData.sessionId);

    return {
      id: row.id,
      sessionId: row.session_id,
      messageType: row.message_type,
      content: row.content,
      metadata: row.metadata,
      createdAt: row.created_at,
    };
  }

  async getMessages(sessionId: string, limit: number = 50, offset: number = 0): Promise<ChatMessage[]> {
    const query = `
      SELECT id, session_id, message_type, content, metadata, created_at
      FROM chat_messages 
      WHERE session_id = $1
      ORDER BY created_at ASC
      LIMIT $2 OFFSET $3
    `;

    const result = await this.db.query(query, [sessionId, limit, offset]);
    
    return result.rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      messageType: row.message_type,
      content: row.content,
      metadata: row.metadata,
      createdAt: row.created_at,
    }));
  }

  async getRecentMessages(sessionId: string, count: number = 10): Promise<ChatMessage[]> {
    const query = `
      SELECT id, session_id, message_type, content, metadata, created_at
      FROM chat_messages 
      WHERE session_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await this.db.query(query, [sessionId, count]);
    
    // Reverse to get chronological order
    return result.rows.reverse().map(row => ({
      id: row.id,
      sessionId: row.session_id,
      messageType: row.message_type,
      content: row.content,
      metadata: row.metadata,
      createdAt: row.created_at,
    }));
  }

  async getUserSessions(userId: string, limit: number = 20): Promise<ChatSession[]> {
    const query = `
      SELECT id, user_id, session_data, last_activity, created_at
      FROM chat_sessions 
      WHERE user_id = $1
      ORDER BY last_activity DESC
      LIMIT $2
    `;

    const result = await this.db.query(query, [userId, limit]);
    
    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      sessionData: row.session_data,
      lastActivity: row.last_activity,
      createdAt: row.created_at,
    }));
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const query = `DELETE FROM chat_sessions WHERE id = $1`;
    const result = await this.db.query(query, [sessionId]);
    return (result.rowCount || 0) > 0;
  }
}