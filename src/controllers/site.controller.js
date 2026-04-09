import { prisma } from '../config/db.js';
import { siteSchema } from '../middleware/validators.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { checkSiteLimit } from '../utils/usage.js';
import { DEFAULT_FIELDS } from '../utils/defaultFields.js';

export const getSites = async (req, res) => {
  try {
    const sites = await prisma.site.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, wpUrl: true, createdAt: true },
    });
    res.json({ sites });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sites' });
  }
};

export const createSite = async (req, res) => {
  try {
    console.log('[createSite] Request body:', req.body);
    console.log('[createSite] User:', req.user?.id);
    const { name, wpUrl, wpUsername, wpPassword } = siteSchema.parse(req.body);

    const siteLimit = await checkSiteLimit(req.user.id);
    if (!siteLimit.allowed) {
      return res.status(403).json({ 
        error: siteLimit.message,
        usage: {
          sitesUsed: siteLimit.current,
          sitesLimit: siteLimit.limit,
        }
      });
    }

    const site = await prisma.site.create({
      data: {
        userId: req.user.id,
        name,
        wpUrl,
        wpUsername,
        wpPasswordEncrypted: encrypt(wpPassword),
      },
    });

    await prisma.siteField.createMany({
      data: DEFAULT_FIELDS.map((field) => ({
        siteId: site.id,
        name: field.name,
        label: field.label,
        type: field.type,
        order: field.order,
        aiEnabled: field.aiEnabled,
        systemPrompt: field.systemPrompt,
      })),
    });

    res.status(201).json({ 
      site: { id: site.id, name: site.name, wpUrl: site.wpUrl, createdAt: site.createdAt } 
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0].message });
    }
    res.status(500).json({ error: 'Failed to create site' });
  }
};

export const updateSite = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, wpUrl, wpUsername, wpPassword } = siteSchema.parse(req.body);

    const site = await prisma.site.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    const updateData = { name, wpUrl, wpUsername };
    if (wpPassword) {
      updateData.wpPasswordEncrypted = encrypt(wpPassword);
    }

    const updated = await prisma.site.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, wpUrl: true, updatedAt: true },
    });

    res.json({ site: updated });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0].message });
    }
    res.status(500).json({ error: 'Failed to update site' });
  }
};

export const deleteSite = async (req, res) => {
  try {
    const { id } = req.params;

    const site = await prisma.site.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    await prisma.site.delete({ where: { id } });

    res.json({ message: 'Site deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete site' });
  }
};

export const getSiteCredentials = async (req, res) => {
  try {
    const { id } = req.params;

    const site = await prisma.site.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    res.json({
      wpUrl: site.wpUrl,
      wpUsername: site.wpUsername,
      wpPassword: decrypt(site.wpPasswordEncrypted),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch credentials' });
  }
};
