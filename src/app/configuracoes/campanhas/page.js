'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import { Upload, FileText, X, CheckCircle, Database, AlertCircle, Loader2, Play, Edit3, Trash2, Plus, Star, LogOut, ArrowRight, ToggleLeft, ToggleRight, Settings } from 'lucide-react';

export default function CampaignsPage() {
    const router = useRouter();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        isActive: false,
        markupPercentage: 0
    });
    const [editingId, setEditingId] = useState(null);

    // File State
    const [visualFile, setVisualFile] = useState(null);
    const [priceFiles, setPriceFiles] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);

    const visualInputRef = useRef(null);
    const priceInputRef = useRef(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://n8n-apintegromat.r954jc.easypanel.host';

    const fetchCampaigns = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/campaigns`);
            setCampaigns(res.data);
        } catch (error) {
            console.error('Failed to fetch campaigns', error);
            // alert('Erro ao carregar campanhas.'); // Suppress initial load error alert for smoother UX if API is waking up
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const toggleActivation = async (campaign) => {
        if (campaign.isActive) return; // Don't deactivate the active one directly, user activates another
        if (!confirm(`Deseja ativar a campanha "${campaign.name}"? A atual será desativada.`)) return;
        try {
            // Optimistic update
            setCampaigns(prev => prev.map(c => ({
                ...c,
                isActive: c.id === campaign.id
            })));

            await axios.put(`${API_URL}/campaigns/${campaign.id}`, { isActive: true });
            fetchCampaigns(); // Sync fully
        } catch (error) {
            console.error('Error activating campaign', error);
            alert('Erro ao ativar campanha.');
            fetchCampaigns();
        }
    };

    const handleEnterSystem = () => {
        router.push('/dashboard');
    };

    const handleLogout = () => {
        router.push('/login');
    };

    const handleVisualFileSelect = (e) => {
        if (e.target.files?.[0]) setVisualFile(e.target.files[0]);
    };

    const handlePriceFileSelect = (e) => {
        if (e.target.files?.length) {
            const newFiles = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
            setPriceFiles(prev => [...prev, ...newFiles]);
        }
        e.target.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let campaignId = editingId;
            let response;

            // 1. Save Basic Info
            const payload = { ...formData };
            if (editingId) {
                response = await axios.put(`${API_URL}/campaigns/${editingId}`, payload);
            } else {
                response = await axios.post(`${API_URL}/campaigns`, payload);
                campaignId = response.data.id;
            }

            // 2. Upload Files (if any)
            if (visualFile || priceFiles.length > 0) {
                const uploadData = new FormData();
                if (visualFile) uploadData.append('pdf', visualFile);
                if (priceFiles.length > 0) {
                    priceFiles.forEach(f => uploadData.append('pricePdf', f));
                }

                await axios.post(`${API_URL}/campaigns/${campaignId}/upload`, uploadData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            alert(editingId ? 'Campanha atualizada!' : 'Campanha criada!');
            closeModal();
            fetchCampaigns();

        } catch (error) {
            console.error('Error saving campaign', error);
            alert('Erro ao salvar campanha: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleGenerate = async (campaignId) => {
        if (!confirm('Deseja baixar o PDF gerado com Markup?')) return;

        setIsGenerating(true);
        try {
            const response = await axios.post(`${API_URL}/campaigns/${campaignId}/generate`, {}, {
                responseType: 'blob',
                timeout: 300000
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `catalogo-markup-campanha-${campaignId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            alert('Download iniciado!');
        } catch (error) {
            console.error('Generation failed', error);
            alert('Falha na geração do PDF.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleEdit = (c) => {
        setEditingId(c.id);
        setFormData({
            name: c.name,
            isActive: c.isActive,
            markupPercentage: c.markupPercentage || 0
        });
        setVisualFile(null);
        setPriceFiles([]);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setFormData({ name: '', isActive: false, markupPercentage: 0 });
        setEditingId(null);
        setVisualFile(null);
        setPriceFiles([]);
    };

    const handleDelete = async (id) => {
        if (!confirm('Tem certeza que deseja excluir esta campanha?')) return;
        try {
            await axios.delete(`${API_URL}/campaigns/${id}`);
            fetchCampaigns();
        } catch (error) {
            console.error('Error deleting campaign', error);
            alert('Erro ao excluir campanha.');
        }
    };

    // Derived State
    const activeCampaign = campaigns.find(c => c.isActive);
    const otherCampaigns = campaigns.filter(c => !c.isActive);

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-12 px-6 md:px-12 pt-8">
            <Head>
                <title>Portal de Campanhas</title>
            </Head>

            <div className="max-w-7xl mx-auto w-full">
                {/* Header - Portal Style (Logo + Actions) */}
                <header className="flex justify-between items-center mb-12">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-orange/10 rounded-xl flex items-center justify-center text-brand-orange border border-brand-orange/20">
                            <Settings size={20} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Portal de Campanhas</h1>
                            <p className="text-gray-500 text-sm">Selecione a coleção ativa para trabalhar</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => { closeModal(); setIsModalOpen(true); }}
                            className="text-gray-600 hover:text-gray-900 hover:bg-white px-4 py-2 rounded-lg transition-colors font-medium flex items-center gap-2"
                        >
                            <Plus size={18} /> Nova Campanha
                        </button>
                        <div className="h-6 w-px bg-gray-300"></div>
                        <button
                            onClick={handleLogout}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors font-medium flex items-center gap-2"
                        >
                            <LogOut size={18} /> Sair
                        </button>
                    </div>
                </header>

                {loading ? (
                    <div className="text-center py-20">
                        <Loader2 className="animate-spin mx-auto text-gray-400 mb-4" size={40} />
                        <p className="text-gray-500">Carregando campanhas...</p>
                    </div>
                ) : (
                    <div className="space-y-12">

                        {/* HERO SECTION - Active Campaign (Focus) */}
                        {activeCampaign ? (
                            <section className="animate-slideUp">
                                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Star size={16} className="text-brand-orange fill-brand-orange" />
                                    Campanha Selecionada
                                </h2>
                                <div className="relative overflow-hidden bg-white rounded-3xl shadow-xl border border-brand-orange/20 ring-4 ring-orange-50/50 group">
                                    {/* Abstract Gradient */}
                                    <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-orange-50 via-white/0 to-transparent opacity-60" />

                                    <div className="relative p-10 md:p-14 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                                        <div className="flex-1 space-y-5">
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-xs font-bold uppercase tracking-wide border border-green-200">
                                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Ativa Agora
                                            </div>
                                            <h2 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight">
                                                {activeCampaign.name}
                                            </h2>
                                            <div className="flex items-center gap-6 text-gray-600">
                                                <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-lg border border-gray-100">
                                                    <Database size={16} className="text-gray-400" />
                                                    <span className="text-sm">Markup: <span className="font-bold text-gray-900">{activeCampaign.markupPercentage}%</span></span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Main Action: ENTER */}
                                        <div className="flex flex-col items-center gap-4 shrink-0 w-full md:w-auto">
                                            <button
                                                onClick={handleEnterSystem}
                                                className="w-full md:w-auto flex items-center justify-center gap-3 px-10 py-5 bg-brand-orange hover:bg-orange-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-orange-200 transition-all hover:-translate-y-1 hover:shadow-orange-300"
                                            >
                                                Entrar no Sistema <ArrowRight size={24} />
                                            </button>

                                            <div className="flex gap-2">
                                                {activeCampaign.visualPdfPath && (
                                                    <button
                                                        onClick={() => handleGenerate(activeCampaign.id)}
                                                        disabled={isGenerating}
                                                        className="text-gray-500 hover:text-brand-orange text-sm font-medium px-4 py-2 hover:bg-orange-50 rounded-lg transition-colors flex items-center gap-1"
                                                    >
                                                        {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                                                        Baixar PDF
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleEdit(activeCampaign)}
                                                    className="text-gray-500 hover:text-blue-600 text-sm font-medium px-4 py-2 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
                                                >
                                                    <Edit3 size={14} /> Editar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        ) : (
                            <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center">
                                <AlertCircle size={40} className="mx-auto text-red-400 mb-3" />
                                <h3 className="text-lg font-bold text-red-800">Nenhuma Campanha Ativa</h3>
                                <p className="text-red-600">Por favor, ative uma coleção abaixo para entrar no sistema.</p>
                            </div>
                        )}

                        {/* GRID SECTION - Other Campaigns */}
                        <section>
                            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">
                                Outras Coleções Disponíveis
                            </h2>
                            {otherCampaigns.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                                    <p className="text-gray-400 font-medium">Você só tem a campanha ativa no momento.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {otherCampaigns.map(c => (
                                        <div key={c.id} className="group bg-white rounded-2xl p-5 border border-gray-200/60 shadow-sm hover:shadow-xl hover:border-gray-300 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between h-full relative overflow-hidden">

                                            <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                                                <button onClick={() => handleEdit(c)} className="p-1.5 bg-white/90 shadow rounded-md hover:text-blue-500 text-gray-400"><Edit3 size={14} /></button>
                                                <button onClick={() => handleDelete(c.id)} className="p-1.5 bg-white/90 shadow rounded-md hover:text-red-500 text-gray-400"><Trash2 size={14} /></button>
                                            </div>

                                            <div>
                                                <div className="w-10 h-10 rounded-xl bg-gray-100 mb-4 flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                                    <FileText size={20} />
                                                </div>

                                                <h3 className="text-lg font-bold text-gray-800 mb-1 leading-snug">{c.name}</h3>

                                                <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
                                                    <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
                                                        <Database size={12} /> {c.markupPercentage}%
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2 mt-auto">
                                                <button
                                                    onClick={() => toggleActivation(c)}
                                                    className="w-full py-2.5 rounded-xl border-2 border-gray-100 text-gray-500 font-bold text-sm hover:border-green-500 hover:text-green-600 hover:bg-green-50 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <ToggleLeft size={18} /> Ativar Coleção
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-8 flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">{editingId ? 'Editar Campanha' : 'Nova Campanha'}</h2>
                                <p className="text-gray-400 text-sm mt-1">Preencha os dados e anexe os arquivos.</p>
                            </div>
                            <button onClick={closeModal} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
                        </div>

                        <div className="p-8 overflow-y-auto custom-scrollbar">
                            <form id="campaignForm" onSubmit={handleSubmit} className="space-y-8">
                                {/* Basic Info */}
                                <div className="grid grid-cols-1 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Nome da Coleção</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all"
                                            placeholder="Ex: Primavera/Verão 2026"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Catalog Configuration */}
                                <div className="border-t border-gray-100 pt-8">
                                    <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                                        <Database size={20} className="text-blue-500" />
                                        Arquivos & Preços
                                    </h3>
                                    <p className="text-gray-400 text-sm mb-6">Configure o catálogo base e as tabelas de custo.</p>

                                    <div className="mb-6">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Markup Padrão (%)</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="number"
                                                step="0.1"
                                                className="w-32 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-orange"
                                                value={formData.markupPercentage}
                                                onChange={e => setFormData({ ...formData, markupPercentage: e.target.value })}
                                            />
                                            <span className="text-sm text-gray-500">% sobre o custo</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-6">
                                        {/* Visual PDF */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-gray-700">Catálogo Visual (PDF)</label>
                                            <div
                                                onClick={() => visualInputRef.current?.click()}
                                                className={`group border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${visualFile ? 'border-green-400 bg-green-50/50' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/30'}`}
                                            >
                                                <input type="file" hidden ref={visualInputRef} accept=".pdf" onChange={handleVisualFileSelect} />
                                                <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center transition-colors ${visualFile ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400 group-hover:text-blue-500'}`}>
                                                    <FileText size={24} />
                                                </div>
                                                <span className="text-sm font-medium text-gray-700 block truncate">
                                                    {visualFile ? visualFile.name : 'Clique para carregar o Catálogo Visual'}
                                                </span>
                                                <span className="text-xs text-gray-400 mt-1 block">PDF até 100MB</span>
                                            </div>
                                        </div>

                                        {/* Price PDFs */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-gray-700">Tabelas de Preço (PDFs)</label>
                                            <div
                                                className="border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all"
                                                onClick={() => priceInputRef.current?.click()}
                                            >
                                                <input type="file" hidden ref={priceInputRef} accept=".pdf" multiple onChange={handlePriceFileSelect} />
                                                <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 mx-auto mb-3 flex items-center justify-center">
                                                    <Upload size={24} />
                                                </div>
                                                <span className="text-sm font-medium text-gray-700">Adicionar Tabelas de Preço</span>
                                                <span className="text-xs text-gray-400 mt-1 block">Pode selecionar múltiplos arquivos</span>
                                            </div>

                                            {/* File List */}
                                            {priceFiles.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                                    {priceFiles.map((f, i) => (
                                                        <span key={i} className="inline-flex items-center gap-2 bg-white pl-3 pr-2 py-1.5 rounded-lg text-sm text-gray-700 border border-gray-200 shadow-sm">
                                                            <span className="truncate max-w-[150px]">{f.name}</span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.stopPropagation(); setPriceFiles(prev => prev.filter((_, idx) => idx !== i)); }}
                                                                className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-md transition-colors"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="p-8 border-t border-gray-100 flex justify-end gap-3 shrink-0 bg-gray-50/80 backdrop-blur rounded-b-3xl">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-semibold transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                form="campaignForm"
                                className="px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl shadow-lg font-bold transition-all hover:scale-105 active:scale-95"
                            >
                                {editingId ? 'Salvar Alterações' : 'Criar Campanha'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
