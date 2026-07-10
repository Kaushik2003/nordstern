'use client';

import { useState, useEffect } from 'react';
import { Button } from '@nordstern/shared-ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@nordstern/shared-ui';
import { Input } from '@nordstern/shared-ui';
import { Label } from '@nordstern/shared-ui';
import { Keypair, Transaction, Networks } from '@stellar/stellar-sdk';
import { Loader2, Play, Wallet, RefreshCw, Send, CheckCircle2, AlertCircle } from 'lucide-react';

interface LogMessage {
  time: string;
  type: 'info' | 'success' | 'error';
  text: string;
}

export default function WalletSandbox() {
  // Config state
  const [subdomain, setSubdomain] = useState('manobendra-mandal-s-organization.anchors.localhost');
  const [publicKey, setPublicKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  
  // Dynamic metadata
  const [currency, setCurrency] = useState('MANOBENDRAMA');
  const [authUrl, setAuthUrl] = useState('');
  const [sep24Url, setSep24Url] = useState('');
  const [tomlLoaded, setTomlLoaded] = useState(false);

  // Flow control
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [jwt, setJwt] = useState('');
  const [iframeUrl, setIframeUrl] = useState('');
  const [txId, setTxId] = useState('');
  const [txStatus, setTxStatus] = useState('');

  // Auto-generate keys for developer convenience on mount
  useEffect(() => {
    generateNewKeys();
  }, []);

  function log(text: string, type: LogMessage['type'] = 'info') {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ time, type, text }, ...prev]);
  }

  function generateNewKeys() {
    try {
      const pair = Keypair.random();
      setPublicKey(pair.publicKey());
      setSecretKey(pair.secret());
      log(`Generated new developer Stellar Keypair: ${pair.publicKey().slice(0, 8)}...`);
    } catch (err: any) {
      log(`Key generation failed: ${err.message}`, 'error');
    }
  }

  // Step 1: Query stellar.toml
  async function fetchToml() {
    setLoading(true);
    setTomlLoaded(false);
    log(`Querying stellar.toml from http://${subdomain}/.well-known/stellar.toml...`);
    try {
      const res = await fetch(`http://${subdomain}/.well-known/stellar.toml`);
      if (!res.ok) throw new Error(`toml fetch failed with status ${res.status}`);
      const text = await res.text();
      
      // Basic TOML parser
      const lines = text.split('\n');
      let transferServer = '';
      let webAuth = '';
      let assetCode = 'USDC';

      for (const line of lines) {
        if (line.includes('TRANSFER_SERVER_SEP0024')) {
          transferServer = line.split('=')[1].replace(/"/g, '').trim();
        }
        if (line.includes('WEB_AUTH_ENDPOINT')) {
          webAuth = line.split('=')[1].replace(/"/g, '').trim();
        }
        if (line.includes('code=')) {
          assetCode = line.split('=')[1].replace(/"/g, '').trim();
        }
      }

      if (!transferServer || !webAuth) {
        throw new Error('Could not parse TRANSFER_SERVER_SEP0024 or WEB_AUTH_ENDPOINT from toml');
      }

      setSep24Url(transferServer);
      setAuthUrl(webAuth);
      setCurrency(assetCode);
      setTomlLoaded(true);
      log(`Successfully loaded anchor metadata. Asset: ${assetCode}`, 'success');
      log(`Web Auth endpoint: ${webAuth}`);
      log(`Transfer server endpoint: ${transferServer}`);
    } catch (err: any) {
      log(`Failed to fetch anchor configuration: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Fund account via Friendbot
  async function fundAccount() {
    setLoading(true);
    log(`Requesting testnet Friendbot funding for ${publicKey}...`);
    try {
      const res = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
      if (!res.ok) throw new Error('Friendbot failed. Account may already have funds.');
      log(`Account funded successfully. Active on Stellar Testnet!`, 'success');
    } catch (err: any) {
      log(`Friendbot funding notice: ${err.message}`, 'info');
    } finally {
      setLoading(false);
    }
  }

  // Step 3: Run SEP-10 Auth Challenge & Sign Transaction
  async function runAuth() {
    setLoading(true);
    log('Initiating SEP-10 authentication challenge flow...');
    try {
      // 1. Get Challenge XDR
      const challengeRes = await fetch(`${authUrl}?account=${publicKey}`);
      if (!challengeRes.ok) throw new Error(`Failed to request challenge XDR: ${await challengeRes.text()}`);
      const challengeJson = await challengeRes.json();
      const challengeXdr = challengeJson.transaction;
      log('Received challenge transaction from anchor.');

      // 2. Sign transaction locally using SDK
      log('Signing challenge transaction with local secret key...');
      const tx = new Transaction(challengeXdr, Networks.TESTNET);
      const keypair = Keypair.fromSecret(secretKey);
      tx.sign(keypair);
      const signedXdr = tx.toXDR();

      // 3. Post Signed Challenge back
      log('Posting signed XDR challenge back to authenticate...');
      const authRes = await fetch(authUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction: signedXdr })
      });
      if (!authRes.ok) throw new Error(`Auth validation failed: ${await authRes.text()}`);
      const authJson = await authRes.json();
      setJwt(authJson.token);
      log('✓ Authentication successful! JWT token acquired.', 'success');
    } catch (err: any) {
      log(`Authentication failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  // Step 4: Initiate Deposit / Withdrawal Interactive flow
  async function initiateInteractive(type: 'deposit' | 'withdraw') {
    setLoading(true);
    setIframeUrl('');
    setTxStatus('');
    log(`Initiating interactive ${type} flow...`);
    try {
      const endpoint = `${sep24Url}/transactions/${type}/interactive`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          asset_code: currency,
          account: publicKey
        })
      });

      if (!res.ok) throw new Error(`Interactive call failed: ${await res.text()}`);
      const data = await res.json();
      setIframeUrl(data.url);
      setTxId(data.id);
      log(`Interactive session created. Redirecting to transaction webview...`, 'success');
      
      // Start polling status
      startStatusPoll(data.id);
    } catch (err: any) {
      log(`Failed to start interactive transaction: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  // Poller to check transaction status
  function startStatusPoll(id: string) {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${sep24Url}/transactions/transaction?id=${id}`, {
          headers: { 'Authorization': `Bearer ${jwt}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        const tx = data.transaction;
        setTxStatus(tx.status);
        if (tx.status === 'completed' || tx.status === 'error') {
          clearInterval(interval);
          log(`Transaction completed with final status: ${tx.status.toUpperCase()}`, 'success');
        }
      } catch {
        // ignore errors
      }
    }, 4000);
  }

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Wallet Sandbox</h2>
          <p className="text-muted-foreground">
            Test deposit and withdrawal flows against dynamic subdomains on Stellar Testnet.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Settings Panel */}
        <div className="space-y-6 lg:col-span-5">
          <Card>
            <CardHeader>
              <CardTitle>1. Anchor Subdomain</CardTitle>
              <CardDescription>Specify which dynamic host to query.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subdomain">Home Domain</Label>
                <Input
                  id="subdomain"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value)}
                  placeholder="acme.anchors.localhost"
                />
              </div>
              <Button onClick={fetchToml} disabled={loading} className="w-full">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Query stellar.toml
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>2. Wallet Credentials</CardTitle>
                <CardDescription>Sign transactions and receive/send tokens.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={generateNewKeys}>
                Generate New
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="publicKey">Public Key (G...)</Label>
                <Input
                  id="publicKey"
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secretKey">Secret Key (S...)</Label>
                <Input
                  id="secretKey"
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Button onClick={fundAccount} disabled={loading} variant="outline" className="w-full">
                  <Wallet className="mr-2 h-4 w-4" />
                  Fund on Testnet
                </Button>
                <Button onClick={runAuth} disabled={loading || !tomlLoaded} className="w-full">
                  <Send className="mr-2 h-4 w-4" />
                  Authenticate
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Initiate Transaction</CardTitle>
              <CardDescription>Trigger interactive flows using authenticated sessions.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => initiateInteractive('deposit')}
                disabled={loading || !jwt}
                variant="default"
                className="w-full bg-up text-ink hover:bg-up/90"
              >
                <Play className="mr-2 h-4 w-4" />
                Deposit
              </Button>
              <Button
                onClick={() => initiateInteractive('withdraw')}
                disabled={loading || !jwt}
                variant="default"
                className="w-full"
              >
                <Play className="mr-2 h-4 w-4" />
                Withdraw
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Logs and Iframe Panel */}
        <div className="space-y-6 lg:col-span-7">
          {iframeUrl ? (
            <Card className="h-[620px] flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
                <div>
                  <CardTitle className="capitalize">Interactive Webview</CardTitle>
                  <CardDescription>Transaction ID: <span className="font-mono text-xs">{txId}</span></CardDescription>
                </div>
                {txStatus && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-semibold bg-success-50 text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {txStatus.toUpperCase()}
                  </div>
                )}
              </CardHeader>
              <div className="flex-1 bg-muted/20">
                <iframe
                  src={iframeUrl}
                  className="w-full h-full border-none"
                  title="Stellar Anchor Interactive Flow"
                />
              </div>
            </Card>
          ) : (
            <Card className="h-[360px] flex flex-col">
              <CardHeader>
                <CardTitle>Activity Logger</CardTitle>
                <CardDescription>Real-time updates of operations.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto font-mono text-xs space-y-2 bg-muted/30 p-4 rounded-md mx-6 mb-6">
                {logs.length === 0 ? (
                  <div className="text-muted-foreground text-center py-12">No activity logged yet. Click actions on the left.</div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="flex gap-2 leading-relaxed">
                      <span className="text-muted-foreground shrink-0">{log.time}</span>
                      <span className={
                        log.type === 'success' ? 'text-success font-medium' :
                        log.type === 'error' ? 'text-destructive font-medium' :
                        'text-foreground'
                      }>
                        {log.text}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
