import { useState, useEffect } from 'react';
import api from '../../../services/api';
import { X, User, Phone, Check, Search, Loader, AlertCircle } from 'lucide-react';
import styles from './BlingClientModal.module.css';

/**
 * Modal to select a Bling client when syncing an order
 * Shows clients that match the customer phone number
 */
export default function BlingClientModal({
    customerPhone,
    customerName,
    onSelect,
    onClose,
    onSkip
}) {
    const [loading, setLoading] = useState(true);
    const [clients, setClients] = useState([]);
    const [error, setError] = useState(null);
    const [selectedId, setSelectedId] = useState(null);

    useEffect(() => {
        searchClients();
    }, [customerPhone]);

    const searchClients = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get(`/bling/clients/search?phone=${customerPhone}`);
            setClients(response.data.clients || []);
        } catch (err) {
            console.error('Error searching Bling clients:', err);
            setError('Erro ao buscar clientes no Bling');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = async () => {
        if (!selectedId) return;

        const selectedClient = clients.find(c => c.id === selectedId);
        if (!selectedClient) return;

        try {
            // Save the mapping
            await api.post('/bling/clients/mapping', {
                customerPhone,
                blingClientId: selectedClient.id,
                blingClientName: selectedClient.nome,
                blingClientCpfCnpj: selectedClient.cpfCnpj
            });

            onSelect(selectedClient);
        } catch (err) {
            console.error('Error saving mapping:', err);
            alert('Erro ao salvar vínculo do cliente');
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <div>
                        <h2>Selecionar Cliente Bling</h2>
                        <p className={styles.subtitle}>
                            <User size={14} /> {customerName}
                            <span className={styles.separator}>•</span>
                            <Phone size={14} /> {customerPhone}
                        </p>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className={styles.content}>
                    {loading ? (
                        <div className={styles.loadingState}>
                            <Loader className={styles.spinner} size={32} />
                            <p>Buscando clientes no Bling...</p>
                        </div>
                    ) : error ? (
                        <div className={styles.errorState}>
                            <AlertCircle size={32} />
                            <p>{error}</p>
                            <button onClick={searchClients}>Tentar novamente</button>
                        </div>
                    ) : clients.length === 0 ? (
                        <div className={styles.emptyState}>
                            <Search size={32} />
                            <p>Nenhum cliente encontrado com este telefone</p>
                            <p className={styles.hint}>
                                Um novo cliente será criado automaticamente no Bling.
                            </p>
                        </div>
                    ) : (
                        <div className={styles.clientList}>
                            <p className={styles.listHeader}>
                                {clients.length} cliente(s) encontrado(s):
                            </p>
                            {clients.map((client) => (
                                <div
                                    key={client.id}
                                    className={`${styles.clientCard} ${selectedId === client.id ? styles.selected : ''}`}
                                    onClick={() => setSelectedId(client.id)}
                                >
                                    <div className={styles.clientInfo}>
                                        <div className={styles.clientName}>
                                            {client.nome}
                                        </div>
                                        <div className={styles.clientDetails}>
                                            {client.cpfCnpj && (
                                                <span className={styles.cpfBadge}>
                                                    CPF/CNPJ: {client.cpfCnpj}
                                                </span>
                                            )}
                                            {client.celular && (
                                                <span>📱 {client.celular}</span>
                                            )}
                                            {client.telefone && !client.celular && (
                                                <span>📞 {client.telefone}</span>
                                            )}
                                        </div>
                                    </div>
                                    {selectedId === client.id && (
                                        <div className={styles.checkmark}>
                                            <Check size={20} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <button
                        className={styles.skipBtn}
                        onClick={onSkip}
                    >
                        Criar Novo Cliente
                    </button>
                    <button
                        className={styles.selectBtn}
                        onClick={handleSelect}
                        disabled={!selectedId}
                    >
                        <Check size={16} />
                        Usar Cliente Selecionado
                    </button>
                </div>
            </div>
        </div>
    );
}
