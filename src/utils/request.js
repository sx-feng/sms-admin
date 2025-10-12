// request.js
// const baseURL = 'http://103.236.74.15:8088/';
const baseURL = 'http://192.168.110.101:8065';

/**
 * 通用请求方法（强化版）
 * - 自动防止 JSON 解析错误
 * - 统一错误结构 { ok, code, message, data }
 * - 支持 GET / POST / query 模式
 */
export async function request(methodFlag, url, jsonData = {}, isquery = false) {
  try {
    let finalUrl = baseURL + url;

    // 拼接 query 参数
    if ((methodFlag === 0 && Object.keys(jsonData).length > 0) || (methodFlag === 1 && isquery)) {
      const query = Object.entries(jsonData)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
      finalUrl += (url.includes('?') ? '&' : '?') + query;
    }

    const options = {
      method: methodFlag === 1 ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': localStorage.getItem('token') || '',
      },
    };

    if (methodFlag === 1 && !isquery) {
      options.body = JSON.stringify(jsonData);
    }

    const response = await fetch(finalUrl, options);

    // HTTP 状态检查
    if (!response.ok) {
      console.error('❌ HTTP 状态错误:', response.status, finalUrl);
      return { ok: false, code: response.status, message: `HTTP错误 ${response.status}`, data: null };
    }

    // 读取文本
    const text = await response.text();
    if (!text) {
      console.warn('⚠️ 空响应体:', finalUrl);
      return { ok: false, code: 0, message: '服务器未返回数据', data: null };
    }

    // 尝试解析 JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('⚠️ JSON 解析失败:', text);
      return { ok: false, code: 0, message: '返回数据不是 JSON 格式', data: text };
    }

    // 统一返回
    return {
      ok: data.code === 200 || data.ok === true,
      code: data.code || 0,
      message: data.message || '',
      data: data.data || null,
    };
  } catch (err) {
    console.error('🌐 网络或解析异常:', err);
    return { ok: false, code: -1, message: '网络异常或服务器错误', data: null };
  }
}

