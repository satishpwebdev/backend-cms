import axios from 'axios';
import { prisma } from '../config/db.js';
import { decrypt } from '../utils/encryption.js';
import { checkAndIncrementUsage } from '../utils/usage.js';

const getCredentials = async (userId, siteId) => {
  const site = await prisma.site.findFirst({
    where: { id: siteId, userId },
  });
  if (!site) throw new Error('Site not found');
  return {
    wpUrl: site.wpUrl.replace(/\/+$/, ''),
    wpUsername: site.wpUsername,
    wpPassword: decrypt(site.wpPasswordEncrypted),
  };
};

const getAuthHeader = (username, password) => {
  const encoded = btoa(`${username}:${password}`);
  return `Basic ${encoded}`;
};

export const validateSite = async (req, res) => {
  try {
    const { siteId } = req.body;
    const { wpUrl, wpUsername, wpPassword } = await getCredentials(req.user.id, siteId);

    const response = await axios.get(`${wpUrl}/wp-json/wp/v2/pages?per_page=1`, {
      headers: { Authorization: getAuthHeader(wpUsername, wpPassword) },
      timeout: 15000,
    });

    res.json({ success: true, status: response.status });
  } catch (err) {
    if (err.response?.status === 401) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getPageIdBySlug = async (req, res) => {
  try {
    const { siteId, slug } = req.body;
    const { wpUrl, wpUsername, wpPassword } = await getCredentials(req.user.id, siteId);

    const response = await axios.get(`${wpUrl}/wp-json/wp/v2/pages`, {
      params: { slug },
      headers: { Authorization: getAuthHeader(wpUsername, wpPassword) },
      timeout: 15000,
    });

    if (response.data.length === 0) {
      return res.status(404).json({ success: false, error: `Page "${slug}" not found` });
    }

    res.json({ success: true, id: response.data[0].id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updatePageAcf = async (req, res) => {
  try {
    const { siteId, pageId, acfData } = req.body;
    const { wpUrl, wpUsername, wpPassword } = await getCredentials(req.user.id, siteId);

    const usageCheck = await checkAndIncrementUsage(req.user.id, 'rowsUpdated');
    if (!usageCheck.allowed) {
      return res.status(403).json({ 
        success: false, 
        error: usageCheck.message,
        usage: {
          rowsUsed: usageCheck.current,
          rowsLimit: usageCheck.limit,
          plan: usageCheck.plan,
        }
      });
    }

    const response = await axios.post(
      `${wpUrl}/wp-json/wp/v2/pages/${pageId}`,
      { acf: acfData },
      {
        headers: { Authorization: getAuthHeader(wpUsername, wpPassword) },
        timeout: 15000,
      }
    );

    res.json({ 
      success: true, 
      data: response.data,
      usage: {
        rowsUsed: usageCheck.current,
        rowsLimit: usageCheck.limit,
        plan: usageCheck.plan,
      }
    });
  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(404).json({ success: false, error: `Page ${pageId} not found` });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getPages = async (req, res) => {
  try {
    const { siteId, page = 1, perPage = 20, search = '' } = req.query;
    const { wpUrl, wpUsername, wpPassword } = await getCredentials(req.user.id, siteId);

    const params = { page, per_page: perPage, _embed: true };
    if (search) params.search = search;

    const response = await axios.get(`${wpUrl}/wp-json/wp/v2/pages`, {
      params,
      headers: { Authorization: getAuthHeader(wpUsername, wpPassword) },
      timeout: 15000,
    });

    const total = parseInt(response.headers['x-wp-total'] || '0', 10);
    const totalPages = parseInt(response.headers['x-wp-totalpages'] || '0', 10);

    res.json({ success: true, data: response.data, total, totalPages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getPosts = async (req, res) => {
  try {
    const { siteId, page = 1, perPage = 20, search = '' } = req.query;
    const { wpUrl, wpUsername, wpPassword } = await getCredentials(req.user.id, siteId);

    const params = { page, per_page: perPage, _embed: true };
    if (search) params.search = search;

    const response = await axios.get(`${wpUrl}/wp-json/wp/v2/posts`, {
      params,
      headers: { Authorization: getAuthHeader(wpUsername, wpPassword) },
      timeout: 15000,
    });

    const total = parseInt(response.headers['x-wp-total'] || '0', 10);
    const totalPages = parseInt(response.headers['x-wp-totalpages'] || '0', 10);

    res.json({ success: true, data: response.data, total, totalPages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getStats = async (req, res) => {
  try {
    const { siteId } = req.query;
    const { wpUrl, wpUsername, wpPassword } = await getCredentials(req.user.id, siteId);

    const [pagesRes, postsRes, mediaRes] = await Promise.all([
      axios.get(`${wpUrl}/wp-json/wp/v2/pages`, {
        params: { per_page: 1 },
        headers: { Authorization: getAuthHeader(wpUsername, wpPassword) },
        timeout: 15000,
      }),
      axios.get(`${wpUrl}/wp-json/wp/v2/posts`, {
        params: { per_page: 1 },
        headers: { Authorization: getAuthHeader(wpUsername, wpPassword) },
        timeout: 15000,
      }),
      axios.get(`${wpUrl}/wp-json/wp/v2/media`, {
        params: { per_page: 1 },
        headers: { Authorization: getAuthHeader(wpUsername, wpPassword) },
        timeout: 15000,
      }),
    ]);

    res.json({
      success: true,
      pages: parseInt(pagesRes.headers['x-wp-total'] || '0', 10),
      posts: parseInt(postsRes.headers['x-wp-total'] || '0', 10),
      media: parseInt(mediaRes.headers['x-wp-total'] || '0', 10),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
