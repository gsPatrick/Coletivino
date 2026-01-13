'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import { Upload, FileText, X, CheckCircle, Database, AlertCircle, Loader2 } from 'lucide-react';

export default function CampaignsPage() {
    const router = useRouter();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        startDate: '',
        endDate: '',
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

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    const fetchCampaigns = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/campaigns`);
            setCampaigns(res.data);
        } catch (error) {
            console.error('Failed to fetch campaigns', error);
            alert('Erro ao carregar campanhas.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const toggleActivation = async (campaign) => {
        if (campaign.isActive) return;
        try {
            setCampaigns(prev => prev.map(c => ({ ...c, isActive: c.id === campaign.id })));
            await axios.put(`${API_URL}/campaigns/${campaign.id}`, { isActive: true });
            fetchCampaigns();
        } catch (error) {
            console.error('Error activating campaign', error);
            alert('Erro ao ativar campanha.');
            fetchCampaigns();
        }
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

                // We can also update markup here just in case, but usually handled in 1.
                // Call upload endpoint
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
        // Confirmation is good, but maybe optional if it's just a download tool now
        if (!confirm('Deseja baixar o PDF gerado com Markup?')) return;

        setIsGenerating(true);
        try {
            // Request BLOB response for download
            const response = await axios.post(`${API_URL}/campaigns/${campaignId}/generate`, {}, {
                responseType: 'blob', // Important
                timeout: 300000 // 5m
            });

            // Create Download Link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `catalogo-markup-campanha-${campaignId}.pdf`); // Filename
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            alert('Download iniciado!');
            // No need to fetchCampaigns unless we want to update some "Last Generated" timestamp, but user said "baixa igual antes"
        } catch (error) {
            console.error('Generation failed', error);
            // Handle blob error to text
            alert('Falha na geração do PDF.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleEdit = (c) => {
        setEditingId(c.id);
        setFormData({
            name: c.name,
            startDate: c.startDate || '',
            endDate: c.endDate || '',
            isActive: c.isActive,
            markupPercentage: c.markupPercentage || 0
        });
        // Note: we don't load files back into "File Objects" because JS security prevents it.
        // We just show them as "Existing" in UI if we implemented that logic.
        // For now, clean state implies "New Uploads".
        setVisualFile(null);
        setPriceFiles([]);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setFormData({ name: '', startDate: '', endDate: '', isActive: false, markupPercentage: 0 });
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

    return (
        <div className="font-sans text-gray-900">
            <Head>
                <title>Gestão de Campanhas | Dashboard</title>
            </Head>

            <div className="flex-1">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Gestão de Campanhas</h1>
                        <p className="text-gray-500 mt-1">Configure períodos, tabelas de preço e catálogos.</p>
                    </div>
                    <button
                        onClick={() => {
                            closeModal(); // Reset first
                            setIsModalOpen(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-md font-medium transition-all"
                    >
                        + Nova Campanha
                    </button>
                </header>

                {loading ? (
                    <div className="text-center py-12 text-gray-500">Carregando...</div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                                <tr>
                                    <th className="p-4 border-b">ID</th>
                                    <th className="p-4 border-b">Nome</th>
                                    <th className="p-4 border-b">Período</th>
                                    <th className="p-4 border-b">Status</th>
                                    <th className="p-4 border-b text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {campaigns.map(c => (
                                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4 text-gray-500">#{c.id}</td>
                                        <td className="p-4">
                                            <div className="font-semibold text-gray-800">{c.name}</div>
                                            <div className="text-xs text-blue-600 font-medium">Markup: {c.markupPercentage}%</div>
                                        </td>
                                        <td className="p-4 text-gray-600 text-sm">
                                            {c.startDate ? new Date(c.startDate).toLocaleDateString() : 'Início N/A'} <br />
                                            {c.endDate ? new Date(c.endDate).toLocaleDateString() : 'Fim N/A'}
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => toggleActivation(c)}
                                                className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all ${c.isActive
                                                    ? 'bg-green-100 text-green-700 cursor-default'
                                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200 cursor-pointer'
                                                    }`}
                                                title={c.isActive ? 'Campanha Ativa' : 'Clique para Ativar'}
                                            >
                                                <div className={`w-2 h-2 rounded-full ${c.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                                                {c.isActive ? 'ATIVA' : 'INATIVA'}
                                            </button>
                                        </td>
                                        <td className="p-4 text-right space-x-2">
                                            {editingId === c.id && isGenerating ? (
                                                <span className="text-xs text-orange-500 animate-pulse">Gerando...</span>
                                            ) : (
                                                <>
                                                    {c.visualPdfPath && (
                                                        <button
                                                            onClick={() => handleGenerate(c.id)}
                                                            className="text-orange-600 hover:text-orange-800 font-medium text-xs border border-orange-200 bg-orange-50 px-2 py-1 rounded"
                                                            title="Gerar/Regerar PDF Final"
                                                        >
                                                            ⚡ Gerar PDF
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleEdit(c)}
                                                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                                    >
                                                        Editar
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => handleDelete(c.id)}
                                                className="text-red-500 hover:text-red-700 font-medium text-sm"
                                            >
                                                Excluir
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {campaigns.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="p-8 text-center text-gray-400">
                                            Nenhuma campanha cadastrada.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
                            <h2 className="text-xl font-bold text-gray-800">{editingId ? 'Editar Campanha' : 'Nova Campanha'}</h2>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <form id="campaignForm" onSubmit={handleSubmit} className="space-y-6">
                                {/* Basic Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Campanha</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="Ex: Inverno 2026"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Início</label>
                                        <input
                                            type="date"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                                            value={formData.startDate}
                                            onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Fim</label>
                                        <input
                                            type="date"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                                            value={formData.endDate}
                                            onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Catalog Configuration */}
                                <div className="border-t border-gray-100 pt-6">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                        <Database size={18} /> Configuração do Catálogo
                                    </h3>

                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Markup Padrão (%)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            className="w-32 px-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500"
                                            value={formData.markupPercentage}
                                            onChange={e => setFormData({ ...formData, markupPercentage: e.target.value })}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Percentual adicionado sobre o preço de custo.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Visual PDF */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">PDF Visual (Catálogo)</label>
                                            <div
                                                onClick={() => visualInputRef.current?.click()}
                                                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${visualFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400'}`}
                                            >
                                                <input type="file" hidden ref={visualInputRef} accept=".pdf" onChange={handleVisualFileSelect} />
                                                <FileText className={`mx-auto mb-2 ${visualFile ? 'text-green-500' : 'text-gray-400'}`} />
                                                <span className="text-sm text-gray-600 block truncate">
                                                    {visualFile ? visualFile.name : 'Clique para selecionar PDF Visual'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Price PDFs */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">Tabelas de Preço</label>
                                            <div
                                                className="border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-lg p-4 text-center cursor-pointer"
                                                onClick={() => priceInputRef.current?.click()}
                                            >
                                                <input type="file" hidden ref={priceInputRef} accept=".pdf" multiple onChange={handlePriceFileSelect} />
                                                <Upload className="mx-auto mb-2 text-gray-400" />
                                                <span className="text-sm text-gray-600">Adicionar Tabelas (+ files)</span>
                                            </div>

                                            {/* File List */}
                                            {priceFiles.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {priceFiles.map((f, i) => (
                                                        <span key={i} className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs text-gray-700 border border-gray-200">
                                                            {f.name}
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.stopPropagation(); setPriceFiles(prev => prev.filter((_, idx) => idx !== i)); }}
                                                                className="text-red-400 hover:text-red-600"
                                                            >
                                                                <X size={12} />
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

                        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 shrink-0 bg-gray-50/50 rounded-b-2xl">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                form="campaignForm"
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md font-medium transition-colors"
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
