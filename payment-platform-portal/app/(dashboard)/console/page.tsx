'use client';

import React, { useEffect, useState } from 'react';
import {
  Terminal,
  Zap,
  Loader2
} from 'lucide-react';
import { gatewaysApi, paymentsApi, customersApi } from '@/lib/api';

export default function ConsolePage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [consoleAmount, setConsoleAmount] = useState('100.00');
  const [consoleCurrency, setConsoleCurrency] = useState('USD');
  const [consoleGateway, setConsoleGateway] = useState('');
  
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [holderName, setHolderName] = useState('John Doe');
  const [pan, setPan] = useState('4242424242424242');
  const [expiryMonth, setExpiryMonth] = useState('12');
  const [expiryYear, setExpiryYear] = useState('2030');
  const [cvv, setCvv] = useState('123');

  const [consoleLogs, setConsoleLogs] = useState<{time: string, msg: string, type: 'info'|'success'|'error'}[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    gatewaysApi.getConfigurations().then(res => {
      setConfigs(res.data);
      if (res.data.length > 0) setConsoleGateway(res.data[0].id);
    });
    customersApi.getCustomers({ limit: 100 }).then(res => {
      const activeCustomers = res.data.data.filter((c: any) => c.isActive);
      setCustomers(activeCustomers);
    });
  }, []);

  const addLog = (msg: string, type: 'info'|'success'|'error' = 'info') => {
    setConsoleLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg, type }]);
  };

  const runTestTransaction = async () => {
    setIsProcessing(true);
    setConsoleLogs([]);
    addLog('Initiating payment request...', 'info');
    
    try {
      addLog(`Routing to Gateway Config: ${consoleGateway || 'Default Routing'}`, 'info');
      
      const payload: any = {
        amount: parseFloat(consoleAmount),
        currency: consoleCurrency,
        capture: true,
        card: {
          pan,
          expiryMonth,
          expiryYear,
          cvv,
          holderName
        }
      };

      if (consoleGateway) payload.gatewayConfigurationId = consoleGateway;
      if (customerId) payload.customerId = customerId;

      const res = await paymentsApi.createPayment(payload);
      
      if (res.data.status === 'CAPTURED' || res.data.status === 'AUTHORIZED') {
        addLog(`Payment ${res.data.status}: ${res.data.id}`, 'success');
      } else {
        addLog(`Payment Failed: ${res.data.id} - ${res.data.status}`, 'error');
      }
    } catch (err: any) {
      addLog(`Error: ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-zinc-50">API Sandbox Console</h2>
          <p className="text-zinc-400 mt-1">Simulate payments using your active configurations.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Input Panel */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col overflow-y-auto">
          <h3 className="text-lg font-semibold text-zinc-50 mb-6 flex items-center gap-2">
            <Terminal className="h-5 w-5 text-indigo-400" />
            Request Payload
          </h3>

          <div className="space-y-5 flex-1">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">Target Gateway Config</label>
              <select 
                value={consoleGateway}
                onChange={e => setConsoleGateway(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Let Orchestrator Decide (Waterfall)</option>
                {configs.map(c => (
                  <option key={c.id} value={c.id}>{c.displayName} ({c.provider.name})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2">Amount</label>
                <input 
                  type="number" 
                  value={consoleAmount}
                  onChange={e => setConsoleAmount(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2">Currency</label>
                <select 
                  value={consoleCurrency}
                  onChange={e => setConsoleCurrency(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">Customer Profile (Optional)</label>
              <select 
                value={customerId}
                onChange={e => {
                  setCustomerId(e.target.value);
                  const selectedCustomer = customers.find(c => c.id === e.target.value);
                  if (selectedCustomer) {
                    setHolderName(`${selectedCustomer.firstName} ${selectedCustomer.lastName}`);
                  }
                }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Guest Checkout (No Customer)</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} ({c.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 border-t border-zinc-800">
              <h4 className="text-sm font-semibold text-zinc-300 mb-4">Payment Method</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-2">Cardholder Name</label>
                  <input 
                    type="text" 
                    value={holderName}
                    onChange={e => setHolderName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-2">Card Number (PAN)</label>
                  <input 
                    type="text" 
                    value={pan}
                    onChange={e => setPan(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500 tracking-widest font-mono"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-2">Month (MM)</label>
                    <input 
                      type="text" 
                      value={expiryMonth}
                      onChange={e => setExpiryMonth(e.target.value)}
                      maxLength={2}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500 text-center font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-2">Year (YYYY)</label>
                    <input 
                      type="text" 
                      value={expiryYear}
                      onChange={e => setExpiryYear(e.target.value)}
                      maxLength={4}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500 text-center font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-2">CVV</label>
                    <input 
                      type="text" 
                      value={cvv}
                      onChange={e => setCvv(e.target.value)}
                      maxLength={4}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500 text-center font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={runTestTransaction}
            disabled={isProcessing}
            className="mt-6 w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] shrink-0"
          >
            {isProcessing ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Processing...</>
            ) : (
              <><Zap className="h-5 w-5" /> Execute Payment</>
            )}
          </button>
        </div>

        {/* Output Console */}
        <div className="bg-black border border-zinc-800 rounded-2xl flex flex-col overflow-hidden relative h-full">
          <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between shrink-0">
            <span className="text-xs font-mono text-zinc-400">Execution Log</span>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-zinc-700" />
              <div className="h-3 w-3 rounded-full bg-zinc-700" />
              <div className="h-3 w-3 rounded-full bg-zinc-700" />
            </div>
          </div>
          
          <div className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-2">
            {consoleLogs.length === 0 && (
              <div className="text-zinc-600 text-center mt-20">
                Awaiting execution...
              </div>
            )}
            {consoleLogs.map((log, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-zinc-600 shrink-0">[{log.time}]</span>
                <span className={`
                  ${log.type === 'success' ? 'text-emerald-400 font-semibold' : ''}
                  ${log.type === 'error' ? 'text-red-400 font-semibold' : ''}
                  ${log.type === 'info' ? 'text-zinc-300' : ''}
                `}>
                  {log.msg}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
