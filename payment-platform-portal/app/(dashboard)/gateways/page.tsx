'use client';

import React, { useEffect, useState } from 'react';
import {
  Network,
  Plus,
  Loader2,
  Settings,
  RefreshCcw,
  CheckCircle2,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { gatewaysApi, handleApiError } from '@/lib/api';
import { Messages } from '@/lib/messages';
import { useNotification } from '@components/notification';
import {
  useFormValidation,
  ValidationField,
  InputErrorState,
  SelectErrorState,
  FormErrorWrapper
} from '@components/validation';

const renderCredentialFields = (
  providerCode: string,
  form: any,
  isEdit: boolean = false
) => {
  const { values, errors, touched, handleChange, handleBlur, isFieldValid } = form;

  switch (providerCode) {
    case 'STRIPE':
      return (
        <ValidationField
          id="apiKey"
          label={isEdit ? "API Key (leave blank to keep current)" : "API Key *"}
          error={errors.apiKey}
          isTouched={touched.apiKey}
          isValid={isFieldValid('apiKey')}
        >
          <InputErrorState
            id="apiKey"
            type="password"
            placeholder={isEdit ? "Enter new API key to update..." : "sk_test_..."}
            value={values.apiKey}
            onChange={e => handleChange('apiKey', e.target.value)}
            onBlur={() => handleBlur('apiKey')}
          />
        </ValidationField>
      );
    case 'NMI':
      return (
        <div className="space-y-4">
          <ValidationField
            id="username"
            label={isEdit ? "Username (leave blank to keep current)" : "Username *"}
            error={errors.username}
            isTouched={touched.username}
            isValid={isFieldValid('username')}
          >
            <InputErrorState
              id="username"
              type="text"
              placeholder={isEdit ? "Enter new username to update..." : "Username.."}
              value={values.username}
              onChange={e => handleChange('username', e.target.value)}
              onBlur={() => handleBlur('username')}
            />
          </ValidationField>
          <ValidationField
            id="password"
            label={isEdit ? "Password (leave blank to keep current)" : "Password *"}
            error={errors.password}
            isTouched={touched.password}
            isValid={isFieldValid('password')}
          >
            <InputErrorState
              id="password"
              type="password"
              placeholder={isEdit ? "Enter new password to update..." : "password.."}
              value={values.password}
              onChange={e => handleChange('password', e.target.value)}
              onBlur={() => handleBlur('password')}
            />
          </ValidationField>
        </div>
      );
    case 'AUTHORIZE_NET':
      return (
        <div className="space-y-4">
          <ValidationField
            id="loginId"
            label={isEdit ? "Login ID (leave blank to keep current)" : "Login ID *"}
            error={errors.loginId}
            isTouched={touched.loginId}
            isValid={isFieldValid('loginId')}
          >
            <InputErrorState
              id="loginId"
              type="text"
              placeholder={isEdit ? "Enter new Login ID to update..." : "Login ID"}
              value={values.loginId}
              onChange={e => handleChange('loginId', e.target.value)}
              onBlur={() => handleBlur('loginId')}
            />
          </ValidationField>
          <ValidationField
            id="transactionKey"
            label={isEdit ? "Transaction Key (leave blank to keep current)" : "Transaction Key *"}
            error={errors.transactionKey}
            isTouched={touched.transactionKey}
            isValid={isFieldValid('transactionKey')}
          >
            <InputErrorState
              id="transactionKey"
              type="password"
              placeholder={isEdit ? "Enter new Transaction Key to update..." : "Transaction Key"}
              value={values.transactionKey}
              onChange={e => handleChange('transactionKey', e.target.value)}
              onBlur={() => handleBlur('transactionKey')}
            />
          </ValidationField>
        </div>
      );
    case 'CARDPOINTE':
    case 'CUSTOM':
      return (
        <div className="space-y-4">
          <ValidationField
            id="merchantid"
            label={isEdit ? "Merchant ID (leave blank to keep current)" : "Merchant ID *"}
            error={errors.merchantid}
            isTouched={touched.merchantid}
            isValid={isFieldValid('merchantid')}
          >
            <InputErrorState
              id="merchantid"
              type="text"
              placeholder={isEdit ? "Enter new Merchant ID to update..." : "Merchant ID"}
              value={values.merchantid}
              onChange={e => handleChange('merchantid', e.target.value)}
              onBlur={() => handleBlur('merchantid')}
            />
          </ValidationField>
          <ValidationField
            id="cardpointeuser"
            label={isEdit ? "Username (leave blank to keep current)" : "Username *"}
            error={errors.cardpointeuser}
            isTouched={touched.cardpointeuser}
            isValid={isFieldValid('cardpointeuser')}
          >
            <InputErrorState
              id="cardpointeuser"
              type="text"
              placeholder={isEdit ? "Enter new username to update..." : "Username"}
              value={values.cardpointeuser}
              onChange={e => handleChange('cardpointeuser', e.target.value)}
              onBlur={() => handleBlur('cardpointeuser')}
            />
          </ValidationField>
          <ValidationField
            id="cardpointepass"
            label={isEdit ? "Password (leave blank to keep current)" : "Password *"}
            error={errors.cardpointepass}
            isTouched={touched.cardpointepass}
            isValid={isFieldValid('cardpointepass')}
          >
            <InputErrorState
              id="cardpointepass"
              type="password"
              placeholder={isEdit ? "Enter new password to update..." : "Password"}
              value={values.cardpointepass}
              onChange={e => handleChange('cardpointepass', e.target.value)}
              onBlur={() => handleBlur('cardpointepass')}
            />
          </ValidationField>
          <ValidationField
            id="siteName"
            label="Site Name (Optional)"
            error={errors.siteName}
            isTouched={touched.siteName}
            isValid={isFieldValid('siteName')}
          >
            <InputErrorState
              id="siteName"
              type="text"
              placeholder="fts"
              value={values.siteName}
              onChange={e => handleChange('siteName', e.target.value)}
              onBlur={() => handleBlur('siteName')}
            />
          </ValidationField>
        </div>
      );
    default:
      return (
        <ValidationField
          id="secretKey"
          label={isEdit ? "API Secret Key (leave blank to keep current)" : "API Secret Key *"}
          error={errors.secretKey}
          isTouched={touched.secretKey}
          isValid={isFieldValid('secretKey')}
        >
          <InputErrorState
            id="secretKey"
            type="password"
            placeholder={isEdit ? "Enter new key to update..." : "sk_test_..."}
            value={values.secretKey}
            onChange={e => handleChange('secretKey', e.target.value)}
            onBlur={() => handleBlur('secretKey')}
          />
        </ValidationField>
      );
  }
};

export default function GatewaysPage() {
  const notification = useNotification();
  const [configs, setConfigs] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Form Validation hook for Add Gateway
  const addForm = useFormValidation({
    initialValues: {
      providerId: '',
      displayName: '',
      priority: 1,
      apiKey: '',
      username: '',
      password: '',
      loginId: '',
      transactionKey: '',
      merchantid: '',
      cardpointeuser: '',
      cardpointepass: '',
      siteName: '',
      secretKey: ''
    },
    validate: (vals) => {
      const errs: Record<string, string> = {};
      if (!vals.providerId) errs.providerId = 'Provider is required';
      if (!vals.displayName.trim()) errs.displayName = 'Display name is required';
      if (!vals.priority || vals.priority < 1) errs.priority = 'Priority must be at least 1';

      const provider = providers.find(p => p.id === vals.providerId);
      const code = provider?.code?.toUpperCase() || '';

      if (code === 'STRIPE') {
        if (!vals.apiKey.trim()) errs.apiKey = 'API Key is required';
      } else if (code === 'NMI') {
        if (!vals.username.trim()) errs.username = 'Username is required';
        if (!vals.password.trim()) errs.password = 'Password is required';
      } else if (code === 'AUTHORIZE_NET') {
        if (!vals.loginId.trim()) errs.loginId = 'Login ID is required';
        if (!vals.transactionKey.trim()) errs.transactionKey = 'Transaction Key is required';
      } else if (code === 'CARDPOINTE' || code === 'CUSTOM') {
        if (!vals.merchantid.trim()) errs.merchantid = 'Merchant ID is required';
        if (!vals.cardpointeuser.trim()) errs.cardpointeuser = 'Username is required';
        if (!vals.cardpointepass.trim()) errs.cardpointepass = 'Password is required';
      } else if (vals.providerId) {
        if (!vals.secretKey.trim()) errs.secretKey = 'API Secret Key is required';
      }
      return errs;
    },
    onSubmit: async (vals) => {
      const provider = providers.find(p => p.id === vals.providerId);
      const code = provider?.code?.toUpperCase() || '';
      
      const credentials: Record<string, string> = {};
      const addCred = (key: string, value: string) => {
        if (value.trim()) credentials[key] = value.trim();
      };

      if (code === 'STRIPE') {
        addCred('apiKey', vals.apiKey);
      } else if (code === 'NMI') {
        addCred('username', vals.username);
        addCred('password', vals.password);
      } else if (code === 'AUTHORIZE_NET') {
        addCred('loginId', vals.loginId);
        addCred('transactionKey', vals.transactionKey);
      } else if (code === 'CARDPOINTE' || code === 'CUSTOM') {
        addCred('merchantid', vals.merchantid);
        addCred('cardpointeuser', vals.cardpointeuser);
        addCred('cardpointepass', vals.cardpointepass);
        addCred('siteName', vals.siteName);
      } else {
        addCred('secretKey', vals.secretKey);
      }

      try {
        await gatewaysApi.createConfiguration({
          gatewayProviderId: vals.providerId,
          displayName: vals.displayName,
          priority: vals.priority,
          credentials
        });
        setShowAddModal(false);
        addForm.resetForm();
        fetchData();
        notification.success(Messages.GATEWAY.CREATE_SUCCESS);
      } catch (err) {
        handleApiError(err, addForm.setFieldError, Messages.GATEWAY.CREATE_FAILED);
      }
    }
  });

  // Form Validation hook for Edit Gateway
  const editForm = useFormValidation({
    initialValues: {
      id: '',
      providerId: '',
      providerName: '',
      providerCode: '',
      displayName: '',
      priority: 1,
      isActive: true,
      apiKey: '',
      username: '',
      password: '',
      loginId: '',
      transactionKey: '',
      merchantid: '',
      cardpointeuser: '',
      cardpointepass: '',
      siteName: '',
      secretKey: ''
    },
    validate: (vals) => {
      const errs: Record<string, string> = {};
      if (!vals.displayName.trim()) errs.displayName = 'Display name is required';
      if (!vals.priority || vals.priority < 1) errs.priority = 'Priority must be at least 1';
      return errs;
    },
    onSubmit: async (vals) => {
      const credentials: Record<string, string> = {};
      const addCred = (key: string, value: string) => {
        if (value.trim()) credentials[key] = value.trim();
      };

      const code = vals.providerCode;
      if (code === 'STRIPE') {
        addCred('apiKey', vals.apiKey);
      } else if (code === 'NMI') {
        addCred('username', vals.username);
        addCred('password', vals.password);
      } else if (code === 'AUTHORIZE_NET') {
        addCred('loginId', vals.loginId);
        addCred('transactionKey', vals.transactionKey);
      } else if (code === 'CARDPOINTE' || code === 'CUSTOM') {
        addCred('merchantid', vals.merchantid);
        addCred('cardpointeuser', vals.cardpointeuser);
        addCred('cardpointepass', vals.cardpointepass);
        addCred('siteName', vals.siteName);
      } else {
        addCred('secretKey', vals.secretKey);
      }

      const payload: any = {
        displayName: vals.displayName,
        priority: vals.priority,
        isActive: vals.isActive
      };
      if (Object.keys(credentials).length > 0) {
        payload.credentials = credentials;
      }

      try {
        await gatewaysApi.updateConfiguration(vals.id, payload);
        setShowEditModal(false);
        editForm.resetForm();
        fetchData();
        notification.success(Messages.GATEWAY.UPDATE_SUCCESS);
      } catch (err) {
        handleApiError(err, editForm.setFieldError, Messages.GATEWAY.UPDATE_FAILED);
      }
    }
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [confRes, provRes] = await Promise.all([
        gatewaysApi.getConfigurations(),
        gatewaysApi.getProviders()
      ]);
      setConfigs(confRes.data);
      setProviders(provRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetCircuit = async (id: string) => {
    try {
      await gatewaysApi.resetCircuit(id);
      fetchData();
      notification.success(Messages.GATEWAY.CIRCUIT_RESET_SUCCESS);
    } catch (err) {
      notification.error(Messages.GATEWAY.CIRCUIT_RESET_FAILED);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to deactivate/delete this gateway?')) {
      try {
        await gatewaysApi.deleteConfiguration(id);
        fetchData();
        notification.success(Messages.GATEWAY.DELETE_SUCCESS);
      } catch (err) {
        notification.error(Messages.GATEWAY.DELETE_FAILED);
      }
    }
  };

  const openEditModal = (g: any) => {
    editForm.setValues({
      id: g.id,
      providerId: g.provider.id,
      providerName: g.provider.name,
      providerCode: g.provider.code.toUpperCase(),
      displayName: g.displayName,
      priority: g.priority,
      isActive: g.isActive,
      apiKey: '',
      username: '',
      password: '',
      loginId: '',
      transactionKey: '',
      merchantid: '',
      cardpointeuser: '',
      cardpointepass: '',
      siteName: '',
      secretKey: ''
    });
    editForm.setErrors({});
    setShowEditModal(true);
  };

  if (loading && configs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-zinc-50">Gateway Routing</h2>
          <p className="text-zinc-400 mt-1">Configure your payment waterfall and circuit breakers.</p>
        </div>
        <button 
          onClick={() => {
            addForm.resetForm();
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm text-white font-medium transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)]"
        >
          <Plus className="h-4 w-4" />
          Add Gateway
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Waterfall Logic Visualizer */}
        <div className="md:col-span-1 border-r border-zinc-800 pr-6 relative">
          <div className="absolute top-8 bottom-8 left-6 w-px bg-zinc-800" />
          <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-6">Routing Waterfall</h3>
          
          <div className="space-y-6 relative">
            {configs.length === 0 && (
              <p className="text-sm text-zinc-500 italic pl-12">No gateways configured.</p>
            )}
            {configs.map((g, i) => (
              <div key={g.id} className="flex items-start gap-4 relative">
                <div className={`h-12 w-12 rounded-full border-[4px] border-zinc-950 flex items-center justify-center shrink-0 z-10 ${
                  i === 0 ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-800 text-zinc-500'
                }`}>
                  <span className="font-bold text-sm">{g.priority}</span>
                </div>
                <div className="pt-2 flex-1">
                  <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-zinc-200">{g.displayName}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase ${
                        g.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-500/10 text-zinc-400'
                      }`}>
                        {g.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 uppercase">{g.provider.name}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gateway Configurations */}
        <div className="md:col-span-2 space-y-4 pl-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Configurations</h3>
            <button onClick={fetchData} className="text-zinc-400 hover:text-white" title="Refresh state">
              <RefreshCcw className="h-4 w-4" />
            </button>
          </div>
          
          {configs.map(g => (
            <div key={g.id} className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-zinc-800 rounded-lg flex items-center justify-center shrink-0">
                  <Network className="h-5 w-5 text-zinc-400" />
                </div>
                <div>
                  <h4 className="text-zinc-200 font-semibold">{g.displayName}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-zinc-500 font-mono">ID: {g.id.slice(0,8)}...</span>
                    <span className="text-xs text-zinc-600">•</span>
                    <span className={`text-xs flex items-center gap-1 font-semibold uppercase ${
                      g.circuitState === 'CLOSED' ? 'text-emerald-400' :
                      g.circuitState === 'HALF_OPEN' ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {g.circuitState === 'CLOSED' && <CheckCircle2 className="h-3 w-3" />}
                      {g.circuitState !== 'CLOSED' && <AlertCircle className="h-3 w-3" />}
                      Circuit: {g.circuitState}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {g.circuitState !== 'CLOSED' && (
                  <button 
                    onClick={() => resetCircuit(g.id)}
                    className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-medium rounded-md transition-colors border border-amber-500/20"
                  >
                    Reset Circuit
                  </button>
                )}
                <button 
                  onClick={() => openEditModal(g)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-md transition-colors flex items-center gap-1"
                >
                  <Settings className="h-3 w-3" /> Edit
                </button>
                <button 
                  onClick={() => handleDelete(g.id)}
                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium rounded-md transition-colors flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" /> Deactivate
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-zinc-50 mb-4">Add Gateway</h3>
            <FormErrorWrapper onSubmit={addForm.handleSubmit} className="space-y-4">
              <ValidationField
                id="providerId"
                label="Provider"
                error={addForm.errors.providerId}
                isTouched={addForm.touched.providerId}
                isValid={addForm.isFieldValid('providerId')}
              >
                <SelectErrorState
                  id="providerId"
                  value={addForm.values.providerId}
                  onChange={e => {
                    addForm.handleChange('providerId', e.target.value);
                  }}
                  onBlur={() => addForm.handleBlur('providerId')}
                >
                  <option value="">Select a provider...</option>
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </SelectErrorState>
              </ValidationField>

              <ValidationField
                id="displayName"
                label="Display Name"
                error={addForm.errors.displayName}
                isTouched={addForm.touched.displayName}
                isValid={addForm.isFieldValid('displayName')}
              >
                <InputErrorState
                  id="displayName"
                  type="text"
                  placeholder="e.g. Primary Stripe US"
                  value={addForm.values.displayName}
                  onChange={e => addForm.handleChange('displayName', e.target.value)}
                  onBlur={() => addForm.handleBlur('displayName')}
                />
              </ValidationField>

              <ValidationField
                id="priority"
                label="Priority (1 = Highest)"
                error={addForm.errors.priority}
                isTouched={addForm.touched.priority}
                isValid={addForm.isFieldValid('priority')}
              >
                <InputErrorState
                  id="priority"
                  type="number"
                  min="1"
                  value={addForm.values.priority}
                  onChange={e => addForm.handleChange('priority', parseInt(e.target.value))}
                  onBlur={() => addForm.handleBlur('priority')}
                />
              </ValidationField>

              {(() => {
                const selectedProvider = providers.find(p => p.id === addForm.values.providerId);
                const providerCode = selectedProvider?.code?.toUpperCase() || '';
                return renderCredentialFields(providerCode, addForm, false);
              })()}



              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2 rounded-lg bg-zinc-800 text-sm font-medium text-zinc-300">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2 rounded-lg bg-indigo-600 text-sm font-medium text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                  Save Config
                </button>
              </div>
            </FormErrorWrapper>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-zinc-50 mb-4">Edit Gateway</h3>
            <FormErrorWrapper onSubmit={editForm.handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Provider</label>
                <input
                  disabled
                  value={editForm.values.providerName}
                  className="w-full bg-zinc-950/50 border border-zinc-800/50 rounded-lg p-2.5 text-sm text-zinc-500 cursor-not-allowed"
                />
              </div>

              <ValidationField
                id="displayName"
                label="Display Name"
                error={editForm.errors.displayName}
                isTouched={editForm.touched.displayName}
                isValid={editForm.isFieldValid('displayName')}
              >
                <InputErrorState
                  id="displayName"
                  type="text"
                  value={editForm.values.displayName}
                  onChange={e => editForm.handleChange('displayName', e.target.value)}
                  onBlur={() => editForm.handleBlur('displayName')}
                />
              </ValidationField>

              <div className="grid grid-cols-2 gap-4">
                <ValidationField
                  id="priority"
                  label="Priority"
                  error={editForm.errors.priority}
                  isTouched={editForm.touched.priority}
                  isValid={editForm.isFieldValid('priority')}
                >
                  <InputErrorState
                    id="priority"
                    type="number"
                    min="1"
                    value={editForm.values.priority}
                    onChange={e => editForm.handleChange('priority', parseInt(e.target.value))}
                    onBlur={() => editForm.handleBlur('priority')}
                  />
                </ValidationField>

                <ValidationField
                  id="isActive"
                  label="Status"
                  error={editForm.errors.isActive}
                  isTouched={editForm.touched.isActive}
                  isValid={editForm.isFieldValid('isActive')}
                >
                  <SelectErrorState
                    id="isActive"
                    value={editForm.values.isActive ? 'true' : 'false'}
                    onChange={e => editForm.handleChange('isActive', e.target.value === 'true')}
                    onBlur={() => editForm.handleBlur('isActive')}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </SelectErrorState>
                </ValidationField>
              </div>

              {renderCredentialFields(editForm.values.providerCode, editForm, true)}



              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-2 rounded-lg bg-zinc-800 text-sm font-medium text-zinc-300">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2 rounded-lg bg-indigo-600 text-sm font-medium text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                  Save Changes
                </button>
              </div>
            </FormErrorWrapper>
          </div>
        </div>
      )}
    </div>
  );
}
