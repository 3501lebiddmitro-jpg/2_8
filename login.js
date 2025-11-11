document.addEventListener('alpine:init', () => {
  
});


window.addEventListener('DOMContentLoaded', () => {
  const placeholder = document.getElementById('login-placeholder');
  if (!placeholder) return;

  placeholder.innerHTML = `
    <div id="login-container" class="mb-6" x-show="!accessToken" x-cloak>
      <h2 class="text-xl font-semibold mb-2">Login / Provide Access Token</h2>
      <p class="text-xs text-gray-500 mb-2">You can paste a Matrix access token here or enter username/password for demo (no server auth implemented).</p>
      <input x-model="accessToken" placeholder="Access Token (paste here)" class="border p-2 w-full mb-2 rounded" />
      <div class="flex gap-2">
        <button @click="$dispatch('token-saved')" class="bg-blue-500 text-white px-3 py-1 rounded">Use Token</button>
        <button @click="loginDemo()" class="bg-gray-200 px-3 py-1 rounded">Use Demo</button>
      </div>
    </div>
  `;
});
