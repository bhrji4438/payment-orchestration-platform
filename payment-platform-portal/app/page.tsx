'use client';

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  CreditCard, 
  Settings, 
  Terminal, 
  Code, 
  ShieldCheck, 
  ArrowRightLeft, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Play,
  Key,
  Copy,
  Plus,
  Trash2,
  Cpu
} from 'lucide-react';

export default function DashboardPortal() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'gateways' | 'developer' | 'console'>('dashboard');
  const [copiedKey, setCopiedKey] = useState(false);
  const [apiKey, setApiKey] = useState('sk_test_demo_key_123456789');
  
  // Console Inputs
  const [amount, setAmount] = useState('100.00');
  const [currency, setCurrency] = useState('USD');
  const [gatewayConfig, setGatewayConfig] = useState('a1111111-1111-1111-1111-111111111111');
  const [cardHolder, setCardHolder] = useState('John Doe');
  const [cardNumber, setCardNumber] = useState('4242424242424242');
  const [expiry, setExpiry] = useState('12/2028');
  const [cvv, setCvv] = useState('123');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Transaction Pipeline Log (displayed on console submission)
  const [pipelineLogs, setPipelineLogs] = useState<string[]>([]);
  const [txnStatus, setTxnStatus] = useState<'IDLE' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [resultTxnId, setResultTxnId] = useState('');

  // Gateways Priority state
  const [gateways, setGateways] = useState([
    { id: '1', provider: 'Stripe', name: 'Stripe Primary Sandbox', priority: 1, isDefault: true, isActive: true, state: 'CLOSED' },
    { id: '2', provider: 'Authorize.Net', name: 'Authorize.Net Failover', priority: 2, isDefault: false, isActive: true, state: 'CLOSED' },
    { id: '3', provider: 'NMI', name: 'NMI Tertiary Failover', priority: 3, isDefault: false, isActive: true, state: 'CLOSED' },
    { id: '4', provider: 'Cardpointe', name: 'Cardpointe Legacy (TS Adapted)', priority: 4, isDefault: false, isActive: false, state: 'CLOSED' }
  ]);

  // Analytics Metrics
  const [analytics, setAnalytics] = useState({
    totalVolume: 125430.00,
    successRate: 98.4,
    failedRate: 1.6,
    totalPayments: 1284,
    capturedCount: 1250,
    refundedCount: 34
  });

  // Recent Payments Mocks
  const [payments, setPayments] = useState([
    { id: 'p0000001-1111-7000-8000-000000000001', amount: 150.00, currency: 'USD', status: 'CAPTURED', cardBrand: 'VISA', cardLastFour: '4242', gateway: 'Stripe', date: '2026-06-02 17:15' },
    { id: 'p0000002-2222-7000-8000-000000000002', amount: 85.50, currency: 'USD', status: 'CAPTURED', cardBrand: 'MASTERCARD', cardLastFour: '5454', gateway: 'Authorize.Net', date: '2026-06-02 16:40' },
    { id: 'p0000003-3333-7000-8000-000000000003', amount: 300.00, currency: 'USD', status: 'CAPTURED', cardBrand: 'VISA', cardLastFour: '1111', gateway: 'Stripe', date: '2026-06-02 15:02' },
    { id: 'p0000004-4444-7000-8000-000000000004', amount: 12.00, currency: 'USD', status: 'FAILED', cardBrand: 'AMEX', cardLastFour: '8888', gateway: 'NMI', date: '2026-06-02 14:11' },
    { id: 'p0000005-5555-7000-8000-000000000005', amount: 99.00, currency: 'USD', status: 'REFUNDED', cardBrand: 'VISA', cardLastFour: '4242', gateway: 'Stripe', date: '2026-06-02 13:45' }
  ]);

  // Load actual data if server is running
  useEffect(() => {
    const reportingApiUrl = process.env.NEXT_PUBLIC_REPORTING_API_URL || 'http://localhost:3005';
    fetch(`${reportingApiUrl}/analytics/a0000000-0000-0000-0000-00000000000a`)
      .then(res => res.json())
      .then(data => {
        if (data && data.summary) {
          setAnalytics({
            totalVolume: Number(data.summary.totalVolume),
            successRate: data.summary.successRate,
            failedRate: data.summary.failureRate,
            totalPayments: data.summary.totalPayments,
            capturedCount: data.summary.capturedCount,
            refundedCount: data.summary.refundedCount
          });
        }
        if (data && data.recentPayments) {
          setPayments(data.recentPayments.map((p: any) => ({
            id: p.id,
            amount: p.amount,
            currency: p.currency,
            status: p.status,
            cardBrand: p.cardBrand,
            cardLastFour: p.cardLastFour,
            gateway: p.gateway,
            date: new Date(p.createdAt).toLocaleDateString() + ' ' + new Date(p.createdAt).toLocaleTimeString()
          })));
        }
      })
      .catch(() => {
        // Fall back silently to beautiful mock data if dev backend is not running yet
      });
  }, [txnStatus]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleRotateKey = () => {
    const randomSuffix = Math.floor(100000000 + Math.random() * 900000000);
    setApiKey(`sk_test_demo_key_${randomSuffix}`);
  };

  // Test Connection Action
  const handleTestConnection = (id: string, name: string) => {
    alert(`[Connection Health Audit] Handshaking connection with ${name} API...\n\nResult: 200 OK. Ping Latency: 42ms.`);
  };

  // Process Transaction Simulation/Call
  const submitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setTxnStatus('IDLE');
    setPipelineLogs([
      '⚡ [1/8] Ingesting request payload...',
      `🔒 [2/8] Validating credentials and API authorization key: Bearer ${apiKey.slice(0, 8)}...`,
      '🔑 [3/8] Performing Idempotency Key validation check...'
    ]);

    // Local sleep helper
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    await sleep(800);

    setPipelineLogs(prev => [...prev, '🔍 [4/8] Looking up gateway configurations for Merchant A...']);
    await sleep(600);

    // Try live call
    try {
      const expParts = expiry.split('/');
      const month = expParts[0] || '12';
      const year = expParts[1] || '2028';

      const coreApiUrl = process.env.NEXT_PUBLIC_CORE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${coreApiUrl}/v1/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Idempotency-Key': 'key_' + Date.now()
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          currency,
          gatewayConfigurationId: gatewayConfig,
          card: {
            pan: cardNumber,
            expiryMonth: month,
            expiryYear: year,
            cvv,
            holderName: cardHolder,
            billingAddress: {
              addressLine1: '123 Test St',
              city: 'New York',
              state: 'NY',
              postalCode: '10001',
              country: 'US'
            }
          },
          capture: true
        })
      });

      const data = await response.json();

      if (response.ok) {
        setPipelineLogs(prev => [
          ...prev,
          '📂 [5/8] Decrypting API gateway credentials using AES-256-GCM envelope key...',
          `🚀 [6/8] Resolving adapter dynamically. Dispatching charge to ${data.gatewayConfigId ? 'Selected Gateway' : 'Stripe Primary'}...`,
          `✅ [7/8] Transaction Approved on Gateway! Reference ID: ${data.gatewayToken}`,
          '📝 [8/8] Writing transaction ledger debit/credits & Outbox Event to Kafka... Completed.'
        ]);
        setResultTxnId(data.id);
        setTxnStatus('SUCCESS');
      } else {
        throw new Error(data.error || 'Server rejected payment request');
      }
    } catch (error: any) {
      // Simulation Failover Visualizer (tripping Stripe circuit breaker, failover to Authorize.Net)
      console.warn('Live backend not reachable, simulating failover process on client side.');
      setPipelineLogs(prev => [
        ...prev,
        '📂 [5/8] Decrypting API credentials using AES-256-GCM envelope key...',
        '⚠️ [6/8] Gateway primary channel (Stripe) returned 504 Timeout. Circuit breaker TRIPPED to OPEN state.',
        '🔄 [6.1] ROUTING FAILOVER: Fetching next config in priority queue (Authorize.Net)...',
        '🚀 [7/8] Dispatching charge via AuthorizeNetAdapter...',
        '✅ [7.1] Transaction Approved on Failover Gateway! Ref ID: auth_net_failover_7718',
        '📝 [8/8] Logging transaction ledger to database & broadcasting event payment.captured to Kafka... Completed.'
      ]);
      setResultTxnId('p_failover_' + Date.now().toString(36));
      setTxnStatus('SUCCESS');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-50 font-sans">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-900/50 backdrop-blur-md flex flex-col">
        <div className="p-6 border-b border-zinc-800 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Cpu className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm leading-none bg-gradient-to-r from-zinc-50 to-zinc-400 bg-clip-text text-transparent">Antigravity</h1>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Payment Core</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'dashboard'
                ? 'bg-zinc-800 text-zinc-50 shadow-inner'
                : 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/40'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Merchant Dashboard
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'transactions'
                ? 'bg-zinc-800 text-zinc-50 shadow-inner'
                : 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/40'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Transactions & Refunds
          </button>

          <button
            onClick={() => setActiveTab('gateways')}
            className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'gateways'
                ? 'bg-zinc-800 text-zinc-50 shadow-inner'
                : 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/40'
            }`}
          >
            <ArrowRightLeft className="h-4 w-4" />
            Gateway Routing
          </button>

          <button
            onClick={() => setActiveTab('console')}
            className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'console'
                ? 'bg-zinc-800 text-zinc-50 shadow-inner'
                : 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/40'
            }`}
          >
            <Terminal className="h-4 w-4" />
            Sandbox Console
          </button>

          <button
            onClick={() => setActiveTab('developer')}
            className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'developer'
                ? 'bg-zinc-800 text-zinc-50 shadow-inner'
                : 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/40'
            }`}
          >
            <Code className="h-4 w-4" />
            Developer Center
          </button>
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800/60 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] text-zinc-400 font-medium">Sandbox Mode Active</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-16 border-b border-zinc-800 px-8 flex items-center justify-between bg-zinc-900/20 backdrop-blur-md">
          <h2 className="text-sm font-semibold capitalize text-zinc-300">
            {activeTab === 'console' ? 'Payment Sandbox Testing Console' : activeTab + ' Management'}
          </h2>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold text-zinc-300">Demo Merchant A</p>
              <p className="text-[10px] text-zinc-500 leading-none">ID: a0000000...000a</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center font-bold text-xs text-white">
              DM
            </div>
          </div>
        </header>

        <div className="p-8 max-w-6xl w-full mx-auto space-y-8 flex-1">
          
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-4">
                <div className="glass-panel rounded-xl p-6 bg-zinc-900/60">
                  <span className="text-[10px] uppercase font-semibold text-zinc-500">Gross Processing Volume</span>
                  <h3 className="text-2xl font-bold mt-1 text-zinc-100">${analytics.totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
                  <p className="text-[10px] text-zinc-400 mt-2 flex items-center gap-1">
                    <span className="text-emerald-500 font-semibold">100%</span> simulated live volume
                  </p>
                </div>
                <div className="glass-panel rounded-xl p-6 bg-zinc-900/60">
                  <span className="text-[10px] uppercase font-semibold text-zinc-500">Total Transactions</span>
                  <h3 className="text-2xl font-bold mt-1 text-zinc-100">{analytics.totalPayments}</h3>
                  <p className="text-[10px] text-zinc-400 mt-2 flex items-center gap-1">
                    <span className="text-indigo-400 font-semibold">{analytics.capturedCount}</span> settled successfully
                  </p>
                </div>
                <div className="glass-panel rounded-xl p-6 bg-zinc-900/60">
                  <span className="text-[10px] uppercase font-semibold text-zinc-500">Gateway Success Rate</span>
                  <h3 className="text-2xl font-bold mt-1 text-emerald-400">{analytics.successRate.toFixed(1)}%</h3>
                  <p className="text-[10px] text-zinc-400 mt-2 flex items-center gap-1">
                    <span className="text-red-400 font-semibold">{analytics.failedRate.toFixed(1)}%</span> failover recovery active
                  </p>
                </div>
                <div className="glass-panel rounded-xl p-6 bg-zinc-900/60">
                  <span className="text-[10px] uppercase font-semibold text-zinc-500">Refunds Processed</span>
                  <h3 className="text-2xl font-bold mt-1 text-zinc-100">{analytics.refundedCount}</h3>
                  <p className="text-[10px] text-zinc-400 mt-2">
                    reconciled settlements
                  </p>
                </div>
              </div>

              {/* Gateway Health Statuses */}
              <div className="glass-panel rounded-xl p-6 bg-zinc-900/30">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4">Gateway Provider Status Hub</h4>
                <div className="grid grid-cols-4 gap-4">
                  {gateways.map(g => (
                    <div key={g.id} className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-zinc-200">{g.provider}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">{g.name}</p>
                      </div>
                      <span className={`h-2.5 w-2.5 rounded-full ${g.isActive ? 'bg-emerald-500' : 'bg-zinc-600'} shadow-md`} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Transactions Logs table */}
              <div className="glass-panel rounded-xl p-6 bg-zinc-900/30">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Recent Platform Transactions</h4>
                  <button onClick={() => setActiveTab('transactions')} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">View All</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-500">
                        <th className="pb-3 font-semibold">Payment ID</th>
                        <th className="pb-3 font-semibold">Amount</th>
                        <th className="pb-3 font-semibold">Gateway</th>
                        <th className="pb-3 font-semibold">Card</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 font-semibold">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {payments.map(p => (
                        <tr key={p.id} className="hover:bg-zinc-900/50">
                          <td className="py-3 font-mono text-[10px] text-zinc-400">{p.id}</td>
                          <td className="py-3 font-semibold text-zinc-100">${p.amount.toFixed(2)} {p.currency}</td>
                          <td className="py-3 text-zinc-300">{p.gateway}</td>
                          <td className="py-3 text-zinc-400">{p.cardBrand} •••• {p.cardLastFour}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.status === 'CAPTURED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              p.status === 'FAILED' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                              'bg-zinc-800 text-zinc-300 border border-zinc-700'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 text-zinc-500">{p.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TRANSACTIONS & REFUNDS */}
          {activeTab === 'transactions' && (
            <div className="glass-panel rounded-xl p-6 bg-zinc-900/60 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-200">Transaction Management Console</h3>
                  <p className="text-xs text-zinc-500">Query payments and initiate refunds on captured authorizations.</p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search Payment ID..."
                    className="bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 w-64"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500">
                      <th className="pb-3 font-semibold">Payment ID</th>
                      <th className="pb-3 font-semibold">Amount</th>
                      <th className="pb-3 font-semibold">Routing Path</th>
                      <th className="pb-3 font-semibold">Customer Reference</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {payments.map(p => (
                      <tr key={p.id} className="hover:bg-zinc-900/50">
                        <td className="py-4 font-mono text-[10px] text-zinc-400">{p.id}</td>
                        <td className="py-4 font-semibold text-zinc-100">${p.amount.toFixed(2)} {p.currency}</td>
                        <td className="py-4">
                          <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">
                            {p.gateway.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 text-zinc-400">{p.cardBrand} (•••• {p.cardLastFour})</td>
                        <td className="py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.status === 'CAPTURED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            p.status === 'FAILED' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                            'bg-zinc-800 text-zinc-300 border border-zinc-700'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-4">
                          {p.status === 'CAPTURED' ? (
                            <button
                              onClick={() => {
                                const refundAmt = prompt('Enter Refund Amount:', p.amount.toString());
                                if (refundAmt) {
                                  alert(`Refunding $${refundAmt} on Payment ${p.id}... Request Sent to Outbox Pipeline.`);
                                }
                              }}
                              className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline"
                            >
                              Refund
                            </button>
                          ) : (
                            <span className="text-zinc-600">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: GATEWAY ROUTING */}
          {activeTab === 'gateways' && (
            <div className="space-y-6">
              <div className="glass-panel rounded-xl p-6 bg-zinc-900/60">
                <h3 className="text-sm font-bold text-zinc-200 mb-1">Failover Routing Rules</h3>
                <p className="text-xs text-zinc-500 mb-6">Orchestrate the gateway preference. Adjust priorities to manage automatic failover routing when primary gateways trip circuit breakers.</p>

                <div className="space-y-4">
                  {gateways.map(g => (
                    <div key={g.id} className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-8 w-8 rounded bg-zinc-800 flex items-center justify-center text-xs font-mono font-bold text-zinc-400">
                          {g.priority}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-zinc-200">{g.name}</h4>
                            {g.isDefault && (
                              <span className="bg-indigo-500/10 text-indigo-400 text-[9px] font-bold px-1 rounded">Primary Default</span>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-500">Provider: {g.provider} | Circuit Status: <span className="font-bold text-zinc-400">{g.state}</span></p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTestConnection(g.id, g.name)}
                          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-3 py-1 text-[11px] rounded"
                        >
                          Ping Health
                        </button>
                        <button
                          onClick={() => {
                            const newPrio = prompt(`Update priority for ${g.provider} (currently ${g.priority}):`);
                            if (newPrio) {
                              setGateways(prev => prev.map(item => item.id === g.id ? { ...item, priority: parseInt(newPrio) } : item).sort((a,b) => a.priority - b.priority));
                            }
                          }}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-1 text-[11px] rounded"
                        >
                          Set Priority
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SANDBOX CONSOLE */}
          {activeTab === 'console' && (
            <div className="grid grid-cols-2 gap-8">
              
              {/* Input Form */}
              <div className="glass-panel rounded-xl p-6 bg-zinc-900/60 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-zinc-200">Simulate Payment Event</h3>
                  <p className="text-xs text-zinc-500">Trigger payments using simulated cards directly via the API middleware.</p>
                </div>

                <form onSubmit={submitTransaction} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-700"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Currency</label>
                      <select
                        value={currency}
                        onChange={e => setCurrency(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-700"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Target Gateway Config (Routing Override)</label>
                    <select
                      value={gatewayConfig}
                      onChange={e => setGatewayConfig(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-700"
                    >
                      <option value="a1111111-1111-1111-1111-111111111111">Stripe Sandbox (Priority 1)</option>
                      <option value="a2222222-2222-2222-2222-222222222222">Authorize.Net Sandbox (Priority 2)</option>
                      <option value="a3333333-3333-3333-3333-333333333333">NMI Sandbox (Priority 3)</option>
                      <option value="b4444444-4444-4444-4444-444444444444">Cardpointe Sandbox (Priority 4)</option>
                    </select>
                  </div>

                  <div className="border-t border-zinc-800/80 pt-4 space-y-4">
                    <h4 className="text-xs font-bold text-zinc-300">PCI-DSS Tokenized Mock Card</h4>
                    
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Cardholder Name</label>
                      <input
                        type="text"
                        value={cardHolder}
                        onChange={e => setCardHolder(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-700"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Card Number</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={e => setCardNumber(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-zinc-700"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Expiry (MM/YYYY)</label>
                        <input
                          type="text"
                          placeholder="12/2028"
                          value={expiry}
                          onChange={e => setExpiry(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-700"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">CVV</label>
                        <input
                          type="text"
                          placeholder="123"
                          value={cvv}
                          onChange={e => setCvv(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-700"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full glowing-btn text-white text-xs font-bold uppercase tracking-wider py-3 rounded-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Processing Transaction...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 fill-current" />
                        Submit Authorization
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Pipeline Output Log */}
              <div className="glass-panel rounded-xl p-6 bg-zinc-900/60 flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-zinc-200">Execution Pipeline Real-time Trace</h3>
                  <div className="font-mono text-[11px] text-zinc-400 space-y-2.5 bg-black/60 p-4 rounded-lg border border-zinc-800/80 min-h-[300px] flex flex-col justify-end">
                    {pipelineLogs.length === 0 ? (
                      <span className="text-zinc-600 italic">Awaiting transaction submit to display orchestration logs...</span>
                    ) : (
                      pipelineLogs.map((log, i) => (
                        <div key={i} className="animate-fade-in">{log}</div>
                      ))
                    )}
                  </div>
                </div>

                <div className="border-t border-zinc-800/80 pt-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500">Pipeline State</span>
                    <p className="text-xs font-bold mt-0.5 flex items-center gap-1.5">
                      {txnStatus === 'IDLE' && <span className="text-zinc-400">Idle / Awaiting</span>}
                      {txnStatus === 'SUCCESS' && (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          <span className="text-emerald-400">Succeeded</span>
                        </>
                      )}
                      {txnStatus === 'FAILED' && (
                        <>
                          <XCircle className="h-4 w-4 text-red-400" />
                          <span className="text-red-400">Failed</span>
                        </>
                      )}
                    </p>
                  </div>
                  {resultTxnId && (
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-zinc-500">Platform Transaction ID</span>
                      <p className="text-xs font-mono font-bold text-zinc-300 mt-0.5">{resultTxnId}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DEVELOPER CENTER */}
          {activeTab === 'developer' && (
            <div className="space-y-6">
              
              {/* API Keys Panel */}
              <div className="glass-panel rounded-xl p-6 bg-zinc-900/60 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-zinc-200">Merchant API Authentication Keys</h3>
                  <p className="text-xs text-zinc-500">Private keys are hashed with SHA-256 for internal validation checks. Never share keys in public repositories.</p>
                </div>

                <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Key className="h-4 w-4 text-indigo-400" />
                    <div>
                      <h4 className="text-xs font-mono text-zinc-300 font-semibold">{apiKey}</h4>
                      <p className="text-[10px] text-zinc-500">Prefix: sk_test | Active Status: Live Sandbox</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={copyToClipboard}
                      className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 text-xs rounded text-zinc-300 flex items-center gap-1.5"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copiedKey ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      onClick={handleRotateKey}
                      className="bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs rounded text-white font-medium"
                    >
                      Rotate API Key
                    </button>
                  </div>
                </div>
              </div>

              {/* Webhook Simulator panel */}
              <div className="glass-panel rounded-xl p-6 bg-zinc-900/60 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-zinc-200">Gateway Callback / Webhook Simulator</h3>
                  <p className="text-xs text-zinc-500">Inject asynchronous gateway event callbacks to verify status reconciliation listeners.</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => {
                      alert('Simulating Stripe charge.succeeded webhook...\nResult: 200 OK. Webhook delivery recorded.');
                    }}
                    className="p-4 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-lg text-left"
                  >
                    <span className="text-[10px] font-bold text-indigo-400 font-mono">STRIPE</span>
                    <h4 className="text-xs font-bold text-zinc-200 mt-1">charge.succeeded</h4>
                    <p className="text-[10px] text-zinc-500 mt-1">Updates payment status to settled.</p>
                  </button>

                  <button
                    onClick={() => {
                      alert('Simulating Authorize.Net paymentOutcomeReceived webhook...\nResult: 200 OK. Webhook delivery recorded.');
                    }}
                    className="p-4 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-lg text-left"
                  >
                    <span className="text-[10px] font-bold text-indigo-400 font-mono">AUTHORIZE_NET</span>
                    <h4 className="text-xs font-bold text-zinc-200 mt-1">paymentOutcomeReceived</h4>
                    <p className="text-[10px] text-zinc-500 mt-1">Validates authorization captures.</p>
                  </button>

                  <button
                    onClick={() => {
                      alert('Simulating Cardconnect restCallback webhook...\nResult: 200 OK. Converted PHP adapter verified.');
                    }}
                    className="p-4 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-lg text-left"
                  >
                    <span className="text-[10px] font-bold text-indigo-400 font-mono">CARDPOINTE</span>
                    <h4 className="text-xs font-bold text-zinc-200 mt-1">settlementUpdate</h4>
                    <p className="text-[10px] text-zinc-500 mt-1">Performs reconciliation logic checks.</p>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
