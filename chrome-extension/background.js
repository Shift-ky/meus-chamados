const SITE = "https://meus-chamados-robson-041126.nosborx-costa.chatgpt.site";
const LOGIN_REQUIRED = 'Clique em Entrar no My Work, faça login e abra o My Work novamente.';

function failure(message, connection = false) {
  return { data: null, error: { message, connection } };
}

function isAllowed(path, method) {
  if (typeof path !== 'string') return false;
  switch (method) {
    case 'GET': return /^\/api\/tickets(?:\?from=\d+)?$/.test(path) || path === '/api/notes';
    case 'POST': return path === '/api/tickets' || path === '/api/notes';
    case 'PUT': return /^\/api\/notes\/[a-zA-Z0-9-]+$/.test(path);
    case 'DELETE': return /^\/api\/(?:tickets|notes)\/[a-zA-Z0-9-]+$/.test(path);
    default: return false;
  }
}

async function requestMyWork({ path, method, body }) {
  if (!isAllowed(path, method)) return failure('Operação inválida.');
  const payload = body === undefined ? undefined : JSON.stringify(body);
  if (payload?.length > 110000) return failure('Conteúdo muito grande.');

  try {
    const response = await fetch(SITE + '/api/extension/' + path.slice('/api/'.length), {
      method,
      credentials: 'include',
      redirect: 'manual',
      cache: 'no-store',
      headers: {
        'X-My-Work-Client': 'chrome-side-panel',
        ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: payload,
      signal: AbortSignal.timeout(20000),
    });
    if (response.type === 'opaqueredirect' || response.status === 401 ||
        (response.status >= 300 && response.status < 400)) {
      return failure(LOGIN_REQUIRED, true);
    }
    if (response.status >= 500) return failure('O My Work está indisponível. Tente novamente.', true);
    if (!response.headers.get('content-type')?.includes('application/json')) {
      return failure(LOGIN_REQUIRED, true);
    }
    const result = await response.json();
    if (response.status === 403) return failure(result.message || 'Acesso ao My Work recusado.', true);
    return response.ok ? { data: result, error: null } : { data: null, error: result };
  } catch {
    return failure('Não foi possível conectar ao My Work. Verifique a internet e tente atualizar.', true);
  }
}

chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL('sidepanel.html')) return;
  if (message?.type === 'MY_WORK_OPEN') {
    chrome.tabs.create({ url: SITE }).then(() => reply({ ok: true }), () => reply(failure('Não foi possível abrir o site.', true)));
    return true;
  }
  if (message?.type === 'MY_WORK_API') {
    requestMyWork(message).then(reply, () => reply(failure('Falha ao conectar ao My Work.', true)));
    return true;
  }
});
