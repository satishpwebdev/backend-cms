import { prisma } from '../config/db.js';

export const getChatHistories = async (req, res) => {
  try {
    const histories = await prisma.chatHistory.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    res.json({ histories });
  } catch (err) {
    console.error('getChatHistories error:', err);
    res.status(500).json({ error: 'Failed to fetch chat histories' });
  }
};

export const getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await prisma.chatHistory.findFirst({
      where: { id: chatId, userId: req.user.id },
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ chat, messages });
  } catch (err) {
    console.error('getChatMessages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

export const createChat = async (req, res) => {
  try {
    const { title = 'New Chat', messages = [] } = req.body;

    const chat = await prisma.chatHistory.create({
      data: {
        userId: req.user.id,
        title,
        messages: {
          create: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        },
      },
      include: { messages: true },
    });

    res.status(201).json({ chat });
  } catch (err) {
    console.error('createChat error:', err);
    res.status(500).json({ error: 'Failed to create chat' });
  }
};

export const addMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { role, content } = req.body;

    const chat = await prisma.chatHistory.findFirst({
      where: { id: chatId, userId: req.user.id },
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const message = await prisma.chatMessage.create({
      data: { chatId, role, content },
    });

    await prisma.chatHistory.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    res.status(201).json({ message });
  } catch (err) {
    console.error('addMessage error:', err);
    res.status(500).json({ error: 'Failed to add message' });
  }
};

export const updateChatTitle = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { title } = req.body;

    const chat = await prisma.chatHistory.findFirst({
      where: { id: chatId, userId: req.user.id },
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const updated = await prisma.chatHistory.update({
      where: { id: chatId },
      data: { title },
    });

    res.json({ chat: updated });
  } catch (err) {
    console.error('updateChatTitle error:', err);
    res.status(500).json({ error: 'Failed to update chat' });
  }
};

export const deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await prisma.chatHistory.findFirst({
      where: { id: chatId, userId: req.user.id },
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    await prisma.chatHistory.delete({ where: { id: chatId } });

    res.json({ message: 'Chat deleted' });
  } catch (err) {
    console.error('deleteChat error:', err);
    res.status(500).json({ error: 'Failed to delete chat' });
  }
};
