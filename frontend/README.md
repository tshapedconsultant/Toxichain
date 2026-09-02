# Frontend (ToxiChain)

Cliente React + Vite + ethers. Pide una attestation a `VITE_MODERATOR_URL/moderate` y solo entonces llama a `ModeratedBoard.postMessage`. Si el moderator no responde, muestra **contenido no verificado** y no envía la transacción.

## Setup

Desde la raíz del repo:

```bash
npm install --prefix frontend
copy frontend\.env.example frontend\.env
```

Rellena `VITE_CONTRACT_ADDRESS` con la dirección que imprime `scripts/deploy.js` (o el deploy de Sepolia). Reinicia Vite después de cambiar `frontend/.env`.

```bash
npm run frontend:dev
# equivalente: npm run dev --prefix frontend
```

Variables: `VITE_CONTRACT_ADDRESS`, `VITE_MODERATOR_URL`, `VITE_CHAIN_ID`. Detalle en el [README raíz](../README.md#variables-de-entorno).

No commitees `frontend/.env`.
