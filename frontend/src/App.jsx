import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserProvider, Contract, isAddress } from "ethers";
import { MODERATED_BOARD_ABI } from "./abi.js";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "";
const MODERATOR_URL = (import.meta.env.VITE_MODERATOR_URL || "").replace(/\/$/, "");
const EXPECTED_CHAIN_ID = BigInt(import.meta.env.VITE_CHAIN_ID || "31337");
const UNVERIFIED = "contenido no verificado";

function shortAddr(value) {
  if (!value) return "";
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export default function App() {
  const [account, setAccount] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("Connect a wallet to post.");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([]);

  const configured = isAddress(CONTRACT_ADDRESS) && Boolean(MODERATOR_URL);

  const getContract = useCallback(async (withSigner) => {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed");
    }
    const provider = new BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();
    if (network.chainId !== EXPECTED_CHAIN_ID) {
      throw new Error(`Wrong network. Switch to chain ${EXPECTED_CHAIN_ID.toString()}.`);
    }
    if (withSigner) {
      const signer = await provider.getSigner();
      return new Contract(CONTRACT_ADDRESS, MODERATED_BOARD_ABI, signer);
    }
    return new Contract(CONTRACT_ADDRESS, MODERATED_BOARD_ABI, provider);
  }, []);

  const loadHistory = useCallback(async () => {
    if (!isAddress(CONTRACT_ADDRESS) || !window.ethereum) return;
    const contract = await getContract(false);
    const events = await contract.queryFilter(contract.filters.MessagePosted(), 0n, "latest");
    setMessages(
      events
        .map((ev) => ({
          author: ev.args.author,
          content: ev.args.content,
          contentHash: ev.args.contentHash,
          txHash: ev.transactionHash,
        }))
        .reverse()
    );
  }, [getContract]);

  useEffect(() => {
    if (configured) {
      loadHistory().catch(() => {
        setStatus("Could not read on-chain history yet.");
        setError(true);
      });
    }
  }, [configured, loadHistory]);

  async function connect() {
    setError(false);
    try {
      if (!window.ethereum) throw new Error("MetaMask is not installed");
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
      setStatus("Wallet connected.");
      await loadHistory();
    } catch (err) {
      setError(true);
      setStatus(err.message || "Wallet connection failed.");
    }
  }

  async function requestAttestation(author, text) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    try {
      const response = await fetch(`${MODERATOR_URL}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, author }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        if (body.reason === "contenido no verificado" || response.status >= 500) {
          throw new Error(UNVERIFIED);
        }
        throw new Error("Please rephrase your message.");
      }
      const body = await response.json();
      if (!body?.allowed || !body.signature || body.nonce == null || body.deadline == null) {
        throw new Error(UNVERIFIED);
      }
      return body;
    } catch (err) {
      if (err.message === "Please rephrase your message.") {
        throw err;
      }
      throw new Error(UNVERIFIED);
    } finally {
      clearTimeout(timer);
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    const text = content.trim();
    if (!text) {
      setError(true);
      setStatus("Please enter a message.");
      return;
    }
    if (!configured) {
      setError(true);
      setStatus("Missing VITE_CONTRACT_ADDRESS or VITE_MODERATOR_URL.");
      return;
    }

    setBusy(true);
    setError(false);
    setStatus("Requesting moderation attestation…");
    try {
      if (!account) await connect();
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const author = await signer.getAddress();
      const attestation = await requestAttestation(author, text);
      setStatus("Submitting attested message…");
      const contract = await getContract(true);
      const tx = await contract.postMessage(text, attestation.nonce, attestation.deadline, attestation.signature);
      await tx.wait();
      setContent("");
      setStatus("Message posted.");
      await loadHistory();
    } catch (err) {
      setError(true);
      setStatus(err.message || UNVERIFIED);
    } finally {
      setBusy(false);
    }
  }

  const configHint = useMemo(() => {
    if (configured) return `Board ${shortAddr(CONTRACT_ADDRESS)} · moderator ${MODERATOR_URL}`;
    return "Set VITE_CONTRACT_ADDRESS and VITE_MODERATOR_URL before using the dApp.";
  }, [configured]);

  return (
    <main className="app">
      <section className="card">
        <h1>ToxiChain</h1>
        <p className="lede">
          Posts reach the board only with a live EIP-712 attestation. If the moderator does not
          answer, the UI fails closed.
        </p>
        <div className="toolbar">
          <span className="addr">{account ? shortAddr(account) : "Wallet not connected"}</span>
          <button type="button" onClick={connect} disabled={busy}>
            {account ? "Refresh wallet" : "Connect wallet"}
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <input
            type="text"
            maxLength={512}
            placeholder="Write a constructive message"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={busy}
          />
          <button type="submit" disabled={busy || !configured}>
            Post
          </button>
        </form>
        <p className={`status ${error ? "error" : status === "Message posted." ? "ok" : ""}`}>{status}</p>
        <p className="meta">{configHint}</p>
        <h2>On-chain history</h2>
        {messages.length === 0 ? (
          <p className="empty">No attested messages yet.</p>
        ) : (
          <ul className="feed">
            {messages.map((msg) => (
              <li key={`${msg.txHash}-${msg.contentHash}`}>
                <p>{msg.content}</p>
                <div className="meta">{shortAddr(msg.author)}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
