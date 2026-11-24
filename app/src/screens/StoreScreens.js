import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  FlatList,
  Alert,
  Linking,
  Share,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  Page,
  Btn,
  Back,
  Poster,
  GameCover,
  GameCard,
  Tabs,
  Field,
  Notice,
} from '../components';
import { useAuth } from '../AuthContext';
import { useCart } from '../CartContext';
import { request } from '../api';
import { colors, money, s } from '../theme';

const platforms = ['Todos', 'PlayStation', 'Xbox', 'Nintendo', 'PC'];

function Frame({ children, navigation, active }) {
  const { cart } = useCart();
  return (
    <View style={s.page}>
      <View style={{ flex: 1 }}>{children}</View>
      <Tabs
        navigation={navigation}
        active={active}
        quantity={cart.items.reduce((a, b) => a + b.quantity, 0)}
      />
    </View>
  );
}

function useProducts() {
  const [products, setProducts] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const reload = async () => {
    setLoading(true);
    try {
      setProducts((await request('/api/products')).products);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    reload();
  }, []);
  return { products, loading, error, reload };
}

function HeaderLogo() {
  return (
    <Text style={[s.h2, { fontSize: 20 }]}>
      PIXEL<Text style={{ color: colors.accent2 }}>STORE</Text>
    </Text>
  );
}

export function HomeScreen({ navigation }) {
  const { user } = useAuth(),
    { products, loading, error } = useProducts();
  return (
    <Frame navigation={navigation} active="Home">
      <Page
        style={
          Platform.OS === 'web'
            ? { width: '100%', maxWidth: 680, alignSelf: 'center' }
            : undefined
        }
      >
        <View style={[s.row, { marginBottom: 22 }]}>
          <HeaderLogo />
          <View
            style={{
              backgroundColor: colors.surface2,
              padding: 10,
              borderRadius: 30,
            }}
          >
            <Ionicons name="person" size={20} color={colors.accent2} />
          </View>
        </View>
        <Text style={s.muted}>
          OLÁ, {user?.name?.split(' ')[0]?.toUpperCase()} 👋
        </Text>
        <Text style={[s.h1, { marginBottom: 20 }]}>
          Escolha sua próxima{' '}
          <Text style={{ color: colors.accent2 }}>aventura.</Text>
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('Catalog')}
          style={{
            backgroundColor: '#4F398B',
            padding: 23,
            borderRadius: 23,
            minHeight: 158,
            overflow: 'hidden',
            marginBottom: 26,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '800',
              color: colors.accent2,
              letterSpacing: 2,
            }}
          >
            SEU UNIVERSO GAMER
          </Text>
          <Text style={[s.h2, { maxWidth: '65%', marginTop: 9 }]}>
            Grandes jogos. Novas histórias.
          </Text>
          <Text style={{ color: '#E3D9FF', marginTop: 12, fontWeight: '800' }}>
            {'Explorar catálogo  ›'}
          </Text>
          <Text
            style={{
              fontSize: 100,
              position: 'absolute',
              right: -15,
              bottom: -8,
              transform: [{ rotate: '-22deg' }],
            }}
          >
            🎮
          </Text>
        </Pressable>
        <View style={[s.row, { marginBottom: 14 }]}>
          <Text style={s.h2}>Plataformas</Text>
          <Text style={s.tag}>ESCOLHA A SUA</Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 9,
            marginBottom: 27,
          }}
        >
          {platforms.slice(1).map((p) => (
            <Pressable
              key={p}
              accessibilityRole="button"
              onPress={() => navigation.navigate('Catalog', { platform: p })}
              style={{
                paddingHorizontal: 15,
                paddingVertical: 11,
                backgroundColor: colors.surface2,
                borderRadius: 12,
              }}
            >
              <Text style={{ fontWeight: '700', color: colors.text }}>{p}</Text>
            </Pressable>
          ))}
        </View>
        <View style={[s.row, { marginBottom: 14 }]}>
          <Text style={s.h2}>Em destaque</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Catalog')}
          >
            <Text style={{ color: colors.accent2, fontWeight: '800' }}>
              Ver todos ›
            </Text>
          </Pressable>
        </View>
        <Notice text={error} />
        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
            }}
          >
            {products.slice(0, 4).map((p) => (
              <GameCard
                key={p.id}
                game={p}
                onPress={() => navigation.navigate('Details', { id: p.id })}
              />
            ))}
          </View>
        )}
      </Page>
    </Frame>
  );
}

export function CatalogScreen({ navigation, route }) {
  const { products, loading, error, reload } = useProducts();
  const [search, setSearch] = useState(''),
    [platform, setPlatform] = useState(route.params?.platform || 'Todos');
  useEffect(() => {
    if (route.params?.platform) setPlatform(route.params.platform);
  }, [route.params?.platform]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      reload().catch(() => {});
    });
    return unsub;
  }, [navigation]);
  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          (platform === 'Todos' || p.platform === platform) &&
          `${p.title} ${p.genre}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [products, platform, search],
  );
  return (
    <Frame navigation={navigation} active="Catalog">
      <View
        style={{
          flex: 1,
          paddingHorizontal: 20,
          paddingTop: 19,
          ...(Platform.OS === 'web'
            ? { width: '100%', maxWidth: 680, alignSelf: 'center' }
            : {}),
        }}
      >
        <Text style={s.h1}>Catálogo de jogos</Text>
        <Text style={[s.muted, { marginTop: 4, marginBottom: 18 }]}>
          {filtered.length} jogos encontrados
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 13,
            marginBottom: 13,
          }}
        >
          <Ionicons name="search" color={colors.muted} size={18} />
          <TextInput
            testID="catalog-search"
            accessibilityLabel="Buscar jogos"
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por jogo ou gênero..."
            placeholderTextColor="#69728C"
            style={{ padding: 14, color: colors.text, flex: 1 }}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{
            flexGrow: 0,
            flexShrink: 0,
            minHeight: 48,
            marginBottom: 17,
          }}
          contentContainerStyle={{ alignItems: 'center', paddingVertical: 2 }}
        >
          {platforms.map((p) => (
            <Pressable
              key={p}
              accessibilityRole="button"
              onPress={() => setPlatform(p)}
              style={{
                flexShrink: 0,
                minHeight: 44,
                justifyContent: 'center',
                marginRight: 8,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor:
                  platform === p ? colors.accent : colors.surface2,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '700' }}>{p}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Notice text={error} />
        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <FlatList
            testID="catalog-list"
            style={{ flex: 1, minHeight: 0 }}
            data={filtered}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: 'space-between' }}
            keyExtractor={(i) => String(i.id)}
            renderItem={({ item }) => (
              <GameCard
                game={item}
                onPress={() => navigation.navigate('Details', { id: item.id })}
              />
            )}
            ListEmptyComponent={
              <Text style={s.muted}>Nenhum jogo encontrado.</Text>
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Frame>
  );
}

export function DetailsScreen({ navigation, route }) {
  const { token } = useAuth(),
    { add } = useCart();
  const [game, setGame] = useState(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [adding, setAdding] = useState(false);
  useEffect(() => {
    request(`/api/products/${route.params.id}`)
      .then(setGame)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [route.params.id]);
  const addItem = async () => {
    setAdding(true);
    setError('');
    try {
      await add(game.id);
      Alert.alert('Adicionado', 'Jogo adicionado à sacola!', [
        { text: 'Continuar', style: 'cancel' },
        { text: 'Ver sacola', onPress: () => navigation.navigate('Cart') },
      ]);
    } catch (e) {
      setError(e.message);
    } finally {
      setAdding(false);
    }
  };
  return (
    <Page>
      <Back navigation={navigation} title="Detalhes do jogo" />
      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : game ? (
        <>
          <Poster game={game} large />
          <Text style={[s.tag, { marginTop: 24, marginBottom: 9 }]}>
            {game.platform} · {game.genre}
          </Text>
          <Text style={[s.h1, { fontSize: 29, marginBottom: 14 }]}>
            {game.title}
          </Text>
          <Text style={[s.body, { color: colors.muted, marginBottom: 26 }]}>
            {game.description}
          </Text>
          <View style={[s.row, { marginBottom: 22 }]}>
            <View>
              <Text style={s.label}>PREÇO</Text>
              <Text style={[s.h2, { color: colors.accent2, fontSize: 28 }]}>
                {money(game.priceCents)}
              </Text>
            </View>
            <Text
              style={{
                color: game.stock ? colors.success : colors.danger,
                fontWeight: '700',
              }}
            >
              {game.stock ? `${game.stock} disponíveis` : 'Esgotado'}
            </Text>
          </View>
          <Notice text={error} />
          <Btn
            testID="details-add-cart"
            icon="bag-add-outline"
            label="Adicionar à sacola"
            onPress={addItem}
            loading={adding}
            disabled={!game.stock}
          />
          <Text style={[s.muted, { textAlign: 'center', marginTop: 17 }]}>
            Catálogo acadêmico. Nenhuma chave de jogo real é vendida.
          </Text>
        </>
      ) : (
        <Notice text={error} />
      )}
    </Page>
  );
}

export function CartScreen({ navigation }) {
  const { cart, change, remove, refresh } = useCart();
  const [error, setError] = useState('');
  useEffect(() => {
    const fn = () => refresh().catch((e) => setError(e.message));
    const un = navigation.addListener('focus', fn);
    return un;
  }, [navigation, refresh]);
  const doAction = async (f) => {
    setError('');
    try {
      await f();
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <Frame navigation={navigation} active="Cart">
      <Page>
        <Text style={[s.h1, { marginBottom: 6 }]}>Minha sacola</Text>
        <Text style={[s.muted, { marginBottom: 24 }]}>
          {cart.items.length} jogos selecionados
        </Text>
        <Notice text={error} />
        {cart.items.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 95 }}>
            <Text style={{ fontSize: 60 }}>🛍️</Text>
            <Text style={[s.h2, { marginTop: 14, marginBottom: 7 }]}>
              Sua sacola está vazia
            </Text>
            <Text style={[s.muted, { textAlign: 'center', marginBottom: 22 }]}>
              Explore o catálogo e encontre seu próximo jogo.
            </Text>
            <Btn
              label="Ver jogos"
              onPress={() => navigation.navigate('Catalog')}
            />
          </View>
        ) : (
          <>
            {cart.items.map((item) => (
              <View
                key={item.id}
                style={[
                  s.card,
                  { flexDirection: 'row', gap: 13, marginBottom: 13 },
                ]}
              >
                <View
                  style={{
                    width: 75,
                    alignSelf: 'stretch',
                    minHeight: 100,
                    backgroundColor: item.coverColor || '#6754A0',
                    borderRadius: 13,
                    overflow: 'hidden',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <GameCover game={item}>
                    <Text style={{ fontSize: 38 }}>{item.icon || '🎮'}</Text>
                  </GameCover>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.h3, { fontSize: 15 }]}>{item.title}</Text>
                  <Text style={[s.muted, { marginBottom: 7 }]}>
                    {item.platform}
                  </Text>
                  <Text style={{ fontWeight: '800', color: colors.accent2 }}>
                    {money(item.subtotalCents)}
                  </Text>
                  <View style={[s.row, { marginTop: 10 }]}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Diminuir ${item.title}`}
                        onPress={() =>
                          doAction(() =>
                            item.quantity === 1
                              ? remove(item.id)
                              : change(item.id, item.quantity - 1),
                          )
                        }
                      >
                        <Ionicons
                          name="remove-circle-outline"
                          color={colors.text}
                          size={26}
                        />
                      </Pressable>
                      <Text style={s.body}>{item.quantity}</Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Aumentar ${item.title}`}
                        onPress={() =>
                          doAction(() => change(item.id, item.quantity + 1))
                        }
                      >
                        <Ionicons
                          name="add-circle-outline"
                          color={colors.text}
                          size={26}
                        />
                      </Pressable>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remover ${item.title}`}
                      onPress={() => doAction(() => remove(item.id))}
                    >
                      <Ionicons
                        name="trash-outline"
                        color={colors.danger}
                        size={22}
                      />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
            <View style={[s.card, { marginTop: 12, marginBottom: 20 }]}>
              <Text style={s.muted}>Resumo do pedido</Text>
              <View style={[s.row, { marginTop: 12 }]}>
                <Text style={s.h3}>Total</Text>
                <Text style={[s.h2, { color: colors.accent2 }]}>
                  {money(cart.totalCents)}
                </Text>
              </View>
            </View>
            <Btn
              testID="cart-checkout"
              label="Ir para pagamento"
              icon="card-outline"
              onPress={() => navigation.navigate('Checkout')}
            />
          </>
        )}
      </Page>
    </Frame>
  );
}

export function CheckoutScreen({ navigation }) {
  const { token } = useAuth(),
    { cart, refresh } = useCart();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [done, setDone] = useState('');
  const checkout = async (mode) => {
    setBusy(true);
    setError('');
    try {
      const result = await request(`/api/checkout/${mode}`, {
        method: 'POST',
        token,
        body: {},
        timeout: 20000,
      });
      if (mode === 'demo') {
        await refresh();
        setDone(
          `Compra de demonstração #${result.orderId} registrada. Nenhum pagamento foi realizado.`,
        );
      } else if (result.url) {
        await Linking.openURL(result.url);
        setDone(
          `Pedido #${result.orderId} criado. Pagamento pendente até confirmação do Mercado Pago.`,
        );
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page>
      <Back navigation={navigation} title="Finalizar pedido" />
      {done ? (
        <>
          <View
            style={[
              s.card,
              { alignItems: 'center', marginBottom: 20, padding: 30 },
            ]}
          >
            <Ionicons
              name="checkmark-circle-outline"
              color={colors.success}
              size={70}
            />
            <Text style={[s.h2, { textAlign: 'center', marginTop: 12 }]}>
              Pedido registrado
            </Text>
            <Text style={[s.muted, { textAlign: 'center', marginTop: 12 }]}>
              {done}
            </Text>
          </View>
          <Btn
            label="Ver meus pedidos"
            onPress={() => navigation.navigate('Profile')}
          />
        </>
      ) : (
        <>
          <Text style={[s.h2, { marginBottom: 16 }]}>Resumo da compra</Text>
          <View style={[s.card, { marginBottom: 18 }]}>
            {cart.items.map((p) => (
              <View key={p.id} style={[s.row, { paddingVertical: 6 }]}>
                <Text style={[s.muted, { flex: 1 }]}>
                  {p.quantity}× {p.title}
                </Text>
                <Text style={s.body}>{money(p.subtotalCents)}</Text>
              </View>
            ))}
            <View style={s.divider} />
            <View style={s.row}>
              <Text style={s.h3}>Total</Text>
              <Text style={[s.h2, { color: colors.accent2 }]}>
                {money(cart.totalCents)}
              </Text>
            </View>
          </View>
          <Text style={[s.muted, { marginBottom: 20 }]}>
            Checkout Pro do Mercado Pago: você será redirecionado ao ambiente
            oficial para pagar. O pedido permanece pendente até a confirmação do
            provedor.
          </Text>
          <Notice text={error} />
          <Btn
            testID="checkout-mp"
            label="Pagar com Mercado Pago"
            icon="card-outline"
            loading={busy}
            disabled={!cart.items.length}
            onPress={() => checkout('mercadopago')}
          />
          <View style={{ height: 12 }} />
          <Btn
            testID="checkout-demo"
            label="Simular compra (sem cobrança)"
            secondary
            loading={busy}
            disabled={!cart.items.length}
            onPress={() => checkout('demo')}
          />
          <Text style={[s.muted, { marginTop: 12 }]}>
            A simulação só funciona com ENABLE_DEMO_CHECKOUT=1 no backend.
          </Text>
        </>
      )}
    </Page>
  );
}

export function ProfileScreen({ navigation }) {
  const { user, token, logout } = useAuth();
  const [orders, setOrders] = useState([]),
    [error, setError] = useState('');
  const reload = async () => {
    try {
      setOrders((await request('/api/orders', { token })).orders);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  };
  useEffect(() => {
    const unsub = navigation.addListener('focus', reload);
    reload();
    return unsub;
  }, [navigation, token]);
  return (
    <Frame navigation={navigation} active="Profile">
      <Page>
        <Text style={[s.h1, { marginBottom: 22 }]}>Meu perfil</Text>
        <View
          style={[
            s.card,
            {
              marginBottom: 19,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
            },
          ]}
        >
          <View
            style={{
              backgroundColor: colors.accent,
              padding: 16,
              borderRadius: 18,
            }}
          >
            <Ionicons name="person" color="#fff" size={27} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.h3}>{user?.name}</Text>
            <Text style={s.muted}>{user?.email}</Text>
            <Text style={[s.tag, { marginTop: 4 }]}>
              {user?.role === 'admin' ? 'Administrador' : 'Cliente'}
            </Text>
          </View>
        </View>
        {user?.role === 'admin' && (
          <>
            <Btn
              label="Gerenciar jogos (CRUD)"
              icon="construct-outline"
              onPress={() => navigation.navigate('Admin')}
              secondary
            />
            <View style={{ height: 10 }} />
            <Btn
              label="Exportar JSON / Dashboard"
              icon="stats-chart-outline"
              onPress={() => navigation.navigate('Reports')}
              secondary
            />
            <View style={{ height: 16 }} />
          </>
        )}
        <Text style={[s.h2, { marginBottom: 15 }]}>Meus pedidos</Text>
        <Notice text={error} />
        {orders.length === 0 ? (
          <Text style={[s.muted, { marginBottom: 20 }]}>
            Você ainda não fez pedidos.
          </Text>
        ) : (
          orders.map((o) => (
            <View key={o.id} style={[s.card, { marginBottom: 12 }]}>
              <View style={s.row}>
                <Text style={s.h3}>Pedido #{o.id}</Text>
                <Text
                  style={{
                    fontSize: 12,
                    color:
                      o.status === 'paid' || o.status === 'demo_paid'
                        ? colors.success
                        : colors.gold,
                    fontWeight: '800',
                  }}
                >
                  {o.status === 'demo_paid'
                    ? 'SIMULADO'
                    : o.status === 'paid'
                      ? 'PAGO'
                      : o.status === 'pending'
                        ? 'PENDENTE'
                        : o.status}
                </Text>
              </View>
              <Text style={[s.muted, { marginTop: 6 }]}>
                {o.items.map((p) => `${p.quantity}× ${p.title}`).join(', ')}
              </Text>
              <Text style={[s.h3, { color: colors.accent2, marginTop: 9 }]}>
                {money(o.total_cents)}
              </Text>
            </View>
          ))
        )}
        <View style={{ height: 14 }} />
        <Btn
          label="Sair da conta"
          icon="log-out-outline"
          secondary
          onPress={logout}
        />
      </Page>
    </Frame>
  );
}
