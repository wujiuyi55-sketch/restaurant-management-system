const API_BASE = '/api';

async function fetchData(url) {
    try {
        const response = await fetch(`${API_BASE}${url}`, { credentials: 'include' });
        return await response.json();
    } catch (error) {
        console.error('API请求失败:', error);
        return [];
    }
}
