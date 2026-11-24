import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  ScrollView,
  Share,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Page, Btn, Back, Field, Notice } from '../components';
import { useAuth } from '../AuthContext';
import { request } from '../api';
import { colors, money, s } from '../theme';

const initial = {
  title: '',
  platform: 'PC',
  genre: '',
  description: '',
  price: '',
  stock: '',
  icon: '🎮',
  coverColor: '#6754A0',
};
const platforms = ['PC', 'PlayStation', 'Xbox', 'Nintendo'];

export function AdminScreen({ navigation }) {
  const { token, user } = useAuth();
  const [products, setProducts] = useState([]),
    [editing, setEditing] = useState(null),
    [form, setForm] = useState(initial),
    [error, setError] = useState(''),
    [info, setInfo] = useState(''),
    [busy, setBusy] = useState(false);
  const isAdmin = user?.role === 'admin';
  const reload = async () =>
    setProducts((await request('/api/products')).products);
  useEffect(() => {
    reload().catch((e) => setError(e.message));
  }, []);
  const newGame = () => {
    setEditing('new');
    setForm(initial);
    setError('');
  };
  const edit = (p) => {
    setEditing(p.id);
    setForm({
      title: p.title,
      platform: p.platform,
      genre: p.genre,
      description: p.description,
      price: (p.priceCents / 100).toFixed(2).replace('.', ','),
      stock: String(p.stock),
      icon: p.icon,
      coverColor: p.coverColor,
    });
    setError('');
  };
  const submit = async () => {
    const price = parseFloat(form.price.replace(',', '.'));
    const stock = Number(form.stock);
    if (
      !form.title.trim() ||
      !form.genre.trim() ||
      !form.description.trim() ||
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isSafeInteger(stock) ||
      stock < 0
    ) {
      setError('Confira os campos e valores do produto.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await request(
        editing === 'new' ? '/api/products' : `/api/products/${editing}`,
        {
          method: editing === 'new' ? 'POST' : 'PUT',
          token,
          body: { ...form, priceCents: Math.round(price * 100), stock },
        },
      );
      await reload();
      setInfo(editing === 'new' ? 'Jogo cadastrado!' : 'Jogo atualizado!');
      setEditing(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const remove = (p) =>
    Alert.alert('Excluir jogo', `Excluir ${p.title}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await request(`/api/products/${p.id}`, { method: 'DELETE', token });
            setInfo('Jogo excluído');
            await reload();
          } catch (e) {
            setError(e.message);
          }
        },
      },
    ]);
  if (!isAdmin)
    return (
      <Page>
        <Text style={s.error}>Acesso reservado para administradores.</Text>
      </Page>
    );
  return (
    <Page>
      <Back navigation={navigation} title="Gerenciar catálogo" />
      <Text style={[s.h2, { marginBottom: 5 }]}>Produtos • CRUD</Text>
      <Text style={[s.muted, { marginBottom: 18 }]}>
        Inserir, consultar, alterar e excluir jogos no SQLite.
      </Text>
      <Notice text={error} />
      <Notice text={info} type="success" />
      {editing !== null ? (
        <View style={s.card}>
          <Text style={[s.h3, { marginBottom: 17 }]}>
            {editing === 'new' ? 'Novo jogo' : 'Editar jogo'}
          </Text>
          <Field
            label="Título"
            value={form.title}
            onChangeText={(v) => setForm({ ...form, title: v })}
            placeholder="Nome do jogo"
          />
          <Text style={s.label}>PLATAFORMA</Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 15,
            }}
          >
            {platforms.map((p) => (
              <Pressable
                key={p}
                accessibilityRole="button"
                onPress={() => setForm({ ...form, platform: p })}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 11,
                  borderRadius: 10,
                  backgroundColor:
                    form.platform === p ? colors.accent : colors.surface2,
                }}
              >
                <Text style={{ color: '#FFF', fontWeight: '700' }}>{p}</Text>
              </Pressable>
            ))}
          </View>
          <Field
            label="Gênero"
            value={form.genre}
            onChangeText={(v) => setForm({ ...form, genre: v })}
            placeholder="Ex.: Aventura"
          />
          <Field
            label="Descrição"
            value={form.description}
            onChangeText={(v) => setForm({ ...form, description: v })}
            placeholder="Descrição do jogo"
            multiline
          />
          <Field
            label="Preço (R$)"
            value={form.price}
            onChangeText={(v) => setForm({ ...form, price: v })}
            placeholder="99,90"
            keyboardType="decimal-pad"
          />
          <Field
            label="Estoque"
            value={form.stock}
            onChangeText={(v) => setForm({ ...form, stock: v })}
            placeholder="15"
            keyboardType="numeric"
          />
          <Field
            label="Ícone (emoji)"
            value={form.icon}
            onChangeText={(v) => setForm({ ...form, icon: v })}
            placeholder="🎮"
          />
          <Btn
            testID="admin-save"
            label="Salvar produto"
            loading={busy}
            onPress={submit}
          />
          <View style={{ height: 10 }} />
          <Btn label="Cancelar" secondary onPress={() => setEditing(null)} />
        </View>
      ) : (
        <>
          <Btn
            testID="admin-create"
            label="Cadastrar novo jogo"
            icon="add-circle-outline"
            onPress={newGame}
          />
          <View style={{ height: 17 }} />
          {products.map((p) => (
            <View key={p.id} style={[s.card, { marginBottom: 10 }]}>
              <View style={[s.row, { gap: 10 }]}>
                <View
                  style={{
                    backgroundColor: p.coverColor,
                    padding: 12,
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ fontSize: 28 }}>{p.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.h3, { fontSize: 15 }]}>{p.title}</Text>
                  <Text style={s.muted}>
                    {p.platform} • {money(p.priceCents)} • Estoque {p.stock}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 15, marginTop: 12 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Editar ${p.title}`}
                  onPress={() => edit(p)}
                >
                  <Text style={{ color: colors.accent2, fontWeight: '800' }}>
                    ✎ Editar
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Excluir ${p.title}`}
                  onPress={() => remove(p)}
                >
                  <Text style={{ color: colors.danger, fontWeight: '800' }}>
                    ✕ Excluir
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </>
      )}
    </Page>
  );
}

export function ReportsScreen({ navigation }) {
  const { token, user } = useAuth();
  const [data, setData] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const load = async () => {
    try {
      setData(await request('/api/reports/summary', { token }));
    } catch (e) {
      setError(e.message);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const exportJson = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await request('/api/reports/export', {
        method: 'POST',
        token,
        body: {},
      });
      setData(result.report);
      setMessage(`JSON criado no backend: ${result.filename}`);
      await Share.share({
        message: JSON.stringify(result.report, null, 2),
        title: 'Pixel Store — Exportação JSON',
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  if (user?.role !== 'admin')
    return (
      <Page>
        <Text style={s.error}>Acesso restrito.</Text>
      </Page>
    );
  const sums = data?.indicadores;
  const max = Math.max(
    1,
    ...(data?.vendas_por_plataforma || []).map((p) => p.receita_centavos),
  );
  return (
    <Page>
      <Back navigation={navigation} title="Dados e dashboard" />
      <Text style={[s.h1, { marginBottom: 6 }]}>Painel de vendas</Text>
      <Text style={[s.muted, { marginBottom: 20 }]}>
        Métricas reais do SQLite (incluindo pedidos DEMO, quando habilitados).
      </Text>
      <Notice text={error} />
      <Notice text={message} type="success" />
      {!data ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              gap: 10,
              marginBottom: 20,
            }}
          >
            {[
              ['Receita', money(sums.receita_centavos)],
              ['Pedidos', String(sums.pedidos)],
              ['Jogos', String(sums.produtos_ativos)],
              ['Clientes', String(sums.clientes)],
            ].map(([k, v]) => (
              <View key={k} style={[s.card, { width: '48%' }]}>
                <Text style={s.muted}>{k}</Text>
                <Text style={[s.h2, { marginTop: 10, color: colors.accent2 }]}>
                  {v}
                </Text>
              </View>
            ))}
          </View>
          <Text style={[s.h2, { marginBottom: 14 }]}>
            Vendas por plataforma
          </Text>
          {data.vendas_por_plataforma.length === 0 ? (
            <Text style={[s.muted, { marginBottom: 20 }]}>
              Sem vendas confirmadas. Faça uma compra DEMO para gerar dados.
            </Text>
          ) : (
            data.vendas_por_plataforma.map((p) => (
              <View key={p.platform} style={{ marginBottom: 17 }}>
                <View style={s.row}>
                  <Text style={s.body}>{p.platform}</Text>
                  <Text style={s.muted}>{money(p.receita_centavos)}</Text>
                </View>
                <View
                  style={{
                    height: 9,
                    backgroundColor: colors.surface2,
                    borderRadius: 6,
                    marginTop: 8,
                  }}
                >
                  <View
                    style={{
                      height: 9,
                      width: `${(p.receita_centavos / max) * 100}%`,
                      backgroundColor: colors.accent,
                      borderRadius: 6,
                    }}
                  />
                </View>
              </View>
            ))
          )}
          <Text style={[s.muted, { marginTop: 8, marginBottom: 19 }]}>
            O botão exporta o JSON para o diretório backend/data/exports e abre
            o compartilhamento de texto do aparelho. O dashboard em Python lê
            esse arquivo.
          </Text>
          <Btn
            testID="reports-export"
            label="Gerar e compartilhar JSON"
            icon="download-outline"
            onPress={exportJson}
            loading={busy}
          />
        </>
      )}
    </Page>
  );
}
