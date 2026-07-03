import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { OnboardingFormValues } from '@/lib/validations/onboarding';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lightbulb, KeyRound, Download, ShieldCheck, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Keypair } from '@stellar/stellar-sdk';

export function StellarConfig() {
  const { register, watch, setValue, formState: { errors } } = useFormContext<OnboardingFormValues>();
  
  const mode = watch('stellarConfig.keyGenerationMode');
  const hasBackedUp = watch('stellarConfig.hasBackedUpKeys');
  
  const [secrets, setSecrets] = useState<{ issuer: string, distribution: string, sep10: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const generateKeys = () => {
    const issuer = Keypair.random();
    const distribution = Keypair.random();
    const sep10 = Keypair.random();

    setSecrets({
      issuer: issuer.secret(),
      distribution: distribution.secret(),
      sep10: sep10.secret()
    });

    setValue('stellarConfig.issuerPublicKey', issuer.publicKey(), { shouldValidate: true });
    setValue('stellarConfig.distributionPublicKey', distribution.publicKey(), { shouldValidate: true });
    setValue('stellarConfig.sep10SigningPublicKey', sep10.publicKey(), { shouldValidate: true });
    setValue('stellarConfig.hasBackedUpKeys', false, { shouldValidate: true });
  };

  const downloadEnv = () => {
    if (!secrets) return;
    const content = `ISSUER_SECRET_KEY=${secrets.issuer}\nDISTRIBUTION_SECRET_KEY=${secrets.distribution}\nSEP10_SIGNING_SECRET_KEY=${secrets.sep10}\n`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nordstern-keys.env';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-3xl font-bold mb-2">Step 2/5: Stellar Asset Infrastructure</h2>
        <p className="text-subtle text-sm leading-relaxed">
          Define your stablecoin parameters and anchor keys. These on-chain identities link directly to the Stellar network.
        </p>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex gap-4 text-red-900 shadow-sm">
        <div className="text-sm">
          <p className="font-bold mb-1 uppercase tracking-wider text-red-700 text-xs">Critical Security Notice</p>
          <p className="opacity-90 leading-relaxed">
            NordStern is a strictly non-custodial middleware layer. We never store, ingest, or ask for your Secret Keys (starting with 'S'). You will safely bind your secret signing keys locally within your own isolated environment variable runtime.
          </p>
        </div>
      </div>
      
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="stellarConfig.targetAssetCode">Target Asset Code</Label>
            <select 
              id="stellarConfig.targetAssetCode"
              {...register('stellarConfig.targetAssetCode')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">Select asset code...</option>
              <option value="INR">INR (Indian Rupee)</option>
              <option value="USD">USD (US Dollar)</option>
              <option value="EUR">EUR (Euro)</option>
              <option value="BRL">BRL (Brazilian Real)</option>
              <option value="NGN">NGN (Nigerian Naira)</option>
              <option value="MXN">MXN (Mexican Peso)</option>
              <option value="SGD">SGD (Singapore Dollar)</option>
            </select>
            <p className="text-xs text-subtle">The alphanumeric ticker symbol for the asset you are anchoring.</p>
            {errors.stellarConfig?.targetAssetCode && <p className="text-xs text-destructive mt-1">{errors.stellarConfig.targetAssetCode.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="stellarConfig.assetType">Stellar Asset Type</Label>
            <select 
              id="stellarConfig.assetType"
              {...register('stellarConfig.assetType')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">Select type...</option>
              <option value="AlphaNum4">AlphaNum4 (1-4 characters)</option>
              <option value="AlphaNum12">AlphaNum12 (5-12 characters)</option>
            </select>
            <p className="text-xs text-subtle">The data structure defining your asset length on the Stellar ledger.</p>
            {errors.stellarConfig?.assetType && <p className="text-xs text-destructive mt-1">{errors.stellarConfig.assetType.message}</p>}
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-line">
          <Label>Key Generation Strategy</Label>
          <div className="grid md:grid-cols-2 gap-4">
            <label className={cn(
              "p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3",
              mode === 'auto' ? "border-brand bg-brand-50/50 ring-1 ring-brand" : "border-line bg-surface hover:border-brand/50"
            )}>
              <input type="radio" value="auto" {...register('stellarConfig.keyGenerationMode')} className="mt-1 text-brand focus:ring-brand accent-brand" />
              <div>
                <p className="font-semibold text-sm text-ink flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-brand" /> Securely Auto-Generate
                </p>
                <p className="text-xs text-subtle mt-1">We will generate mathematically secure keypairs locally in your browser. (Recommended)</p>
              </div>
            </label>
            <label className={cn(
              "p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3",
              mode === 'manual' ? "border-brand bg-brand-50/50 ring-1 ring-brand" : "border-line bg-surface hover:border-brand/50"
            )}>
              <input type="radio" value="manual" {...register('stellarConfig.keyGenerationMode')} className="mt-1 text-brand focus:ring-brand accent-brand" />
              <div>
                <p className="font-semibold text-sm text-ink flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-muted-foreground" /> Provide My Own Keys
                </p>
                <p className="text-xs text-subtle mt-1">Manually paste your pre-existing 56-character Stellar Public Keys.</p>
              </div>
            </label>
          </div>
        </div>

        {mode === 'auto' && (
          <div className="bg-surface border border-line rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-ink text-sm">Cryptographic Generator</h3>
                <p className="text-xs text-subtle">Keys are generated instantly using the Stellar SDK.</p>
              </div>
              <Button type="button" onClick={() => { setSecrets(null); setIsModalOpen(true); }} variant="outline" className="gap-2 text-brand border-brand/20 hover:bg-brand-50">
                <RefreshCw className="h-4 w-4" /> Generate New Keys
              </Button>
            </div>
            {hasBackedUp && secrets && (
               <p className="text-xs text-green-600 font-medium">✓ Keys generated and backed up successfully.</p>
            )}
            {errors.stellarConfig?.hasBackedUpKeys && <p className="text-xs text-destructive">{errors.stellarConfig.hasBackedUpKeys.message}</p>}
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-line flex justify-between items-center">
                <h3 className="font-bold text-lg text-ink">Secure Key Generation</h3>
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-subtle hover:text-ink">✕</button>
              </div>
              
              {!secrets ? (
                <div className="p-6 space-y-6">
                  <div className="bg-red-50 text-red-800 text-sm p-4 rounded-lg border border-red-200 leading-relaxed">
                    <strong>Sensitive Operation:</strong> You are about to generate highly sensitive cryptographic keys. 
                    These keys control your stablecoin issuance and fiat anchor operations.
                    <br /><br />
                    NordStern does not transmit these keys over the network. They will be generated locally in your browser. 
                    You must be prepared to save them securely (e.g., in a password manager or secure vault) immediately after generation.
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-line">
                    <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                    <Button type="button" onClick={generateKeys} className="bg-brand text-white">Generate Keys Now</Button>
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  <div className="bg-red-50 text-red-800 text-xs p-3 rounded-lg border border-red-200">
                    <strong>Warning:</strong> You must save these keys now. You will never see them again once you close this window.
                  </div>
                  
                  <div className="bg-zinc-950 rounded-lg p-4 font-mono text-xs text-zinc-300 space-y-3 shadow-inner overflow-x-auto border border-zinc-800">
                    <div>
                      <span className="text-zinc-500"># Issuer Secret (DO NOT SHARE)</span>
                      <p className="text-red-400 mt-1">{secrets.issuer}</p>
                    </div>
                    <div>
                      <span className="text-zinc-500"># Distribution Secret (DO NOT SHARE)</span>
                      <p className="text-red-400 mt-1">{secrets.distribution}</p>
                    </div>
                    <div>
                      <span className="text-zinc-500"># SEP-10 Signing Secret (DO NOT SHARE)</span>
                      <p className="text-red-400 mt-1">{secrets.sep10}</p>
                    </div>
                  </div>
                  
                  <Button type="button" onClick={downloadEnv} className="w-full gap-2 bg-zinc-900 text-white hover:bg-zinc-800 h-11">
                    <Download className="h-4 w-4" /> Download Secure Backup (.env)
                  </Button>

                  <label className="flex items-start gap-3 p-3 bg-canvas border border-line rounded-lg cursor-pointer">
                    <input type="checkbox" {...register('stellarConfig.hasBackedUpKeys')} className="mt-0.5 h-4 w-4 rounded text-brand focus:ring-brand accent-brand" />
                    <div>
                      <p className="text-sm font-semibold text-ink">I have securely backed up my Secret Keys.</p>
                      <p className="text-xs text-subtle mt-1">NordStern cannot recover these keys if they are lost.</p>
                    </div>
                  </label>
                  
                  <div className="pt-4 border-t border-line flex justify-end">
                    <Button 
                      type="button" 
                      onClick={() => setIsModalOpen(false)}
                      disabled={!hasBackedUp}
                      className="bg-brand text-white"
                    >
                      Confirm & Close
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="stellarConfig.issuerPublicKey">Issuer Public Key</Label>
            <Input id="stellarConfig.issuerPublicKey" readOnly={mode === 'auto'} className={mode === 'auto' ? "bg-surface text-subtle font-mono text-xs" : "font-mono text-xs"} placeholder="e.g., GABCD..." {...register('stellarConfig.issuerPublicKey')} />
            {errors.stellarConfig?.issuerPublicKey && <p className="text-xs text-destructive">{errors.stellarConfig.issuerPublicKey.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="stellarConfig.distributionPublicKey">Distribution Public Key</Label>
            <Input id="stellarConfig.distributionPublicKey" readOnly={mode === 'auto'} className={mode === 'auto' ? "bg-surface text-subtle font-mono text-xs" : "font-mono text-xs"} placeholder="e.g., GBCDE..." {...register('stellarConfig.distributionPublicKey')} />
            {errors.stellarConfig?.distributionPublicKey && <p className="text-xs text-destructive">{errors.stellarConfig.distributionPublicKey.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="stellarConfig.sep10SigningPublicKey">SEP-10 Signing Public Key</Label>
            <Input id="stellarConfig.sep10SigningPublicKey" readOnly={mode === 'auto'} className={mode === 'auto' ? "bg-surface text-subtle font-mono text-xs" : "font-mono text-xs"} placeholder="e.g., GCDEF..." {...register('stellarConfig.sep10SigningPublicKey')} />
            {errors.stellarConfig?.sep10SigningPublicKey && <p className="text-xs text-destructive">{errors.stellarConfig.sep10SigningPublicKey.message}</p>}
          </div>
        </div>
      </div>

      <div className="mt-8 bg-surface border border-line rounded-xl p-4 flex gap-3 text-sm">
        <Lightbulb className="h-5 w-5 text-brand shrink-0" />
        <p className="text-subtle leading-relaxed">
          <span className="font-semibold text-ink">Quick Tip:</span> Generating your keys securely in the browser ensures that your private keys are never transmitted over the network to our servers.
        </p>
      </div>
    </div>
  );
}
