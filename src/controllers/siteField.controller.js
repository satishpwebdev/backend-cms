import { prisma } from '../config/db.js';

export const getSiteFields = async (req, res) => {
  try {
    const { siteId } = req.params;
    console.log('[getSiteFields] siteId:', siteId, 'userId:', req.user?.id);

    const site = await prisma.site.findFirst({
      where: { id: siteId, userId: req.user.id },
    });

    if (!site) {
      console.log('[getSiteFields] Site not found');
      return res.status(404).json({ error: 'Site not found' });
    }

    const fields = await prisma.siteField.findMany({
      where: { siteId },
      orderBy: { order: 'asc' },
    });

    console.log('[getSiteFields] Found fields:', fields.length);
    res.json({ fields });
  } catch (err) {
    console.error('getSiteFields error:', err);
    res.status(500).json({ error: 'Failed to fetch fields' });
  }
};

export const createSiteField = async (req, res) => {
  try {
    const { siteId } = req.params;
    const { name, label, type = 'text', aiEnabled = true, systemPrompt } = req.body;
    console.log('[createSiteField] siteId:', siteId, 'name:', name, 'label:', label);

    if (!name || !label) {
      return res.status(400).json({ error: 'Name and label are required' });
    }

    const nameRegex = /^[a-z_][a-z0-9_]*$/;
    if (!nameRegex.test(name)) {
      return res.status(400).json({ error: 'Name must be lowercase with underscores only' });
    }

    const site = await prisma.site.findFirst({
      where: { id: siteId, userId: req.user.id },
    });

    if (!site) {
      console.log('[createSiteField] Site not found');
      return res.status(404).json({ error: 'Site not found' });
    }

    const existingField = await prisma.siteField.findFirst({
      where: { siteId, name },
    });

    if (existingField) {
      return res.status(400).json({ error: 'Field with this name already exists' });
    }

    const maxOrder = await prisma.siteField.findFirst({
      where: { siteId },
      orderBy: { order: 'desc' },
    });

    const field = await prisma.siteField.create({
      data: {
        siteId,
        name,
        label,
        type,
        aiEnabled,
        systemPrompt: systemPrompt || null,
        order: maxOrder ? maxOrder.order + 1 : 0,
      },
    });

    console.log('[createSiteField] Field created:', field.id);
    res.status(201).json({ field });
  } catch (err) {
    console.error('createSiteField error:', err);
    res.status(500).json({ error: 'Failed to create field' });
  }
};

export const updateSiteField = async (req, res) => {
  try {
    const { id } = req.params;
    const { label, type, aiEnabled, order, systemPrompt } = req.body;

    const field = await prisma.siteField.findUnique({
      where: { id },
      include: { site: true },
    });

    if (!field || field.site.userId !== req.user.id) {
      return res.status(404).json({ error: 'Field not found' });
    }

    const updated = await prisma.siteField.update({
      where: { id },
      data: {
        ...(label !== undefined && { label }),
        ...(type !== undefined && { type }),
        ...(aiEnabled !== undefined && { aiEnabled }),
        ...(order !== undefined && { order }),
        ...(systemPrompt !== undefined && { systemPrompt: systemPrompt || null }),
      },
    });

    res.json({ field: updated });
  } catch (err) {
    console.error('updateSiteField error:', err);
    res.status(500).json({ error: 'Failed to update field' });
  }
};

export const deleteSiteField = async (req, res) => {
  try {
    const { id } = req.params;

    const field = await prisma.siteField.findUnique({
      where: { id },
      include: { site: true },
    });

    if (!field || field.site.userId !== req.user.id) {
      return res.status(404).json({ error: 'Field not found' });
    }

    await prisma.siteField.delete({ where: { id } });

    res.json({ message: 'Field deleted' });
  } catch (err) {
    console.error('deleteSiteField error:', err);
    res.status(500).json({ error: 'Failed to delete field' });
  }
};
