# Moderator (ToxiChain)

Servicio Express **fail-closed** que firma attestations EIP-712 solo si el texto pasa el filtro determinista (EN/ES, leetspeak, homoglifos) y, salvo `SKIP_TOXICITY=1`, el modelo TensorFlow.js toxicity.

Lee el `.env` de la **raíz** del repo (`Toxichain/.env`). No crees un `.env` aquí con keys.

## Setup

Desde la raíz:

```bash
npm install --prefix moderator
copy .env.example .env   # si aún no existe; rellena ATTESTER_PRIVATE_KEY y CONTRACT_ADDRESS
npm start --prefix moderator
```

Obligatorias para arrancar: `ATTESTER_PRIVATE_KEY`, `CONTRACT_ADDRESS`. Ver la tabla de variables en el [README raíz](../README.md#variables-de-entorno).

`GET /health` — attester, `chainId`, contrato.
`POST /moderate` — body `{ content, author }`; responde `{ allowed, signature, nonce, deadline }` o 403/503.

Si el pipeline hace timeout o falla, la respuesta es **contenido no verificado** y no hay firma.

## Tests

```bash
npm test
# o desde la raíz:
npm run test:moderator
```

No commitees claves ni `.env`.
