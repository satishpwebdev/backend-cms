import { prisma } from '../config/db.js';
import { rowSchema } from '../middleware/validators.js';

export const getRows = async (req, res) => {
  try {
    const { siteId } = req.query;
    const where = { userId: req.user.id };
    if (siteId) where.siteId = siteId;

    const rows = await prisma.row.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rows' });
  }
};

export const createRow = async (req, res) => {
  try {
    const data = rowSchema.parse(req.body);

    if (!data.siteId) {
      return res.status(400).json({ error: 'siteId is required' });
    }

    const site = await prisma.site.findFirst({
      where: { id: data.siteId, userId: req.user.id },
    });

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    const row = await prisma.row.create({
      data: {
        userId: req.user.id,
        siteId: data.siteId,
        pageId: data.pageId,
        slug: data.slug,
        course: data.course,
        details: data.details,
        content: data.content,
        tabsLinks: data.tabs_links || data.tabsLinks,
        bannerUrl: data.banner_url || data.bannerUrl,
      },
    });

    res.status(201).json({ row });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0].message });
    }
    res.status(500).json({ error: 'Failed to create row' });
  }
};

export const updateRow = async (req, res) => {
  try {
    const { id } = req.params;
    const data = rowSchema.partial().parse(req.body);

    const row = await prisma.row.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!row) {
      return res.status(404).json({ error: 'Row not found' });
    }

    const updated = await prisma.row.update({
      where: { id },
      data,
    });

    res.json({ row: updated });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0].message });
    }
    res.status(500).json({ error: 'Failed to update row' });
  }
};

export const deleteRow = async (req, res) => {
  try {
    const { id } = req.params;

    const row = await prisma.row.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!row) {
      return res.status(404).json({ error: 'Row not found' });
    }

    await prisma.row.delete({ where: { id } });

    res.json({ message: 'Row deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete row' });
  }
};

export const bulkUpdateRows = async (req, res) => {
  try {
    const { rows } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'Rows array is required' });
    }

    const results = [];
    for (const row of rows) {
      const existing = await prisma.row.findFirst({
        where: { id: row.id, userId: req.user.id },
      });

      if (!existing) {
        results.push({ id: row.id, status: 'error', message: 'Row not found' });
        continue;
      }

      const updateData = {
        status: row.status ?? existing.status,
        message: row.message ?? existing.message,
      };

      if (row.pageId !== undefined) updateData.pageId = row.pageId;
      if (row.slug !== undefined) updateData.slug = row.slug;
      if (row.course !== undefined) updateData.course = row.course;
      if (row.details !== undefined) updateData.details = row.details;
      if (row.content !== undefined) updateData.content = row.content;
      if (row.tabs_links !== undefined) updateData.tabsLinks = row.tabs_links;
      if (row.banner_url !== undefined) updateData.bannerUrl = row.banner_url;

      const updated = await prisma.row.update({
        where: { id: row.id },
        data: updateData,
      });

      results.push({ id: updated.id, status: 'success' });
    }

    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: 'Bulk update failed' });
  }
};

export const importRows = async (req, res) => {
  try {
    const { siteId, rows } = req.body;

    if (!siteId || !Array.isArray(rows)) {
      return res.status(400).json({ error: 'siteId and rows array required' });
    }

    const site = await prisma.site.findFirst({
      where: { id: siteId, userId: req.user.id },
    });

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    const created = await prisma.row.createMany({
      data: rows.map((r) => ({
        userId: req.user.id,
        siteId,
        pageId: r.pageId || '',
        slug: r.slug || '',
        course: r.course || '',
        details: r.details || '',
        content: r.content || '',
        tabsLinks: r.tabs_links || r.tabsLinks || '',
        bannerUrl: r.banner_url || r.bannerUrl || '',
        status: r.status || 'idle',
        message: r.message || '',
      })),
    });

    res.status(201).json({ imported: created.count });
  } catch (err) {
    res.status(500).json({ error: 'Import failed' });
  }
};
