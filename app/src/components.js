import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, money, s } from './theme';
import { gameCovers } from './gameCovers';

export function Page({ children, scroll = true, style }) {
  const insets = useSafeAreaInsets();
  return scroll ? (
    <ScrollView
      style={s.page}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        s.content,
        { paddingTop: Math.max(16, insets.top + 10) },
        style,
      ]}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[s.page, { paddingTop: Math.max(16, insets.top + 10) }, style]}
    >
      {children}
    </View>
  );
}

export function Btn({
  label,
  onPress,
  secondary = false,
  loading = false,
  disabled = false,
  icon,
  testID,
  style,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: secondary ? colors.surface2 : colors.accent,
          paddingVertical: 15,
          paddingHorizontal: 18,
          borderRadius: 15,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
          minHeight: 49,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#FFF" />
      ) : (
        <>
          {icon && <Ionicons name={icon} color="#FFF" size={18} />}
          <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  testID,
  multiline,
}) {
  return (
    <View>
      <Text style={s.label}>{label.toUpperCase()}</Text>
      <TextInput
        testID={testID}
        accessibilityLabel={label}
        style={[s.input, multiline && { height: 90, textAlignVertical: 'top' }]}
        placeholder={placeholder}
        placeholderTextColor="#69728C"
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
      />
    </View>
  );
}

export function Back({ navigation, title, right }) {
  return (
    <View style={[s.row, { marginBottom: 22 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        onPress={() => navigation.goBack()}
        style={{
          padding: 8,
          backgroundColor: colors.surface2,
          borderRadius: 12,
        }}
      >
        <Ionicons name="arrow-back" color={colors.text} size={20} />
      </Pressable>
      <Text style={[s.h3, { flex: 1, marginLeft: 12 }]}>{title}</Text>
      {right}
    </View>
  );
}

// Compartilha o carregamento e o fallback entre pôsteres e miniaturas.
export function GameCover({ game, children }) {
  const source = Object.prototype.hasOwnProperty.call(gameCovers, game.title)
    ? gameCovers[game.title]
    : null;
  const [failedSource, setFailedSource] = useState(null);
  if (!source || failedSource === source) return <>{children}</>;
  return (
    <Image
      key={game.title}
      source={source}
      accessibilityLabel={`Capa de ${game.title}`}
      resizeMode="cover"
      onError={() => setFailedSource(source)}
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        width: '100%',
        height: '100%',
      }}
    />
  );
}

export function Poster({ game, large = false }) {
  return (
    <View
      style={{
        width: '100%',
        aspectRatio: 3 / 4,
        ...(large ? { maxWidth: 360, alignSelf: 'center' } : {}),
        backgroundColor: game.coverColor || '#6754A0',
        borderRadius: 18,
        overflow: 'hidden',
        padding: 16,
        justifyContent: 'space-between',
      }}
    >
      <GameCover game={game}>
        <View
          style={{
            width: 130,
            height: 130,
            borderRadius: 80,
            backgroundColor: 'rgba(255,255,255,0.10)',
            position: 'absolute',
            right: -18,
            top: -23,
          }}
        />
        <View
          style={{
            width: 90,
            height: 90,
            borderRadius: 65,
            backgroundColor: 'rgba(0,0,0,0.13)',
            position: 'absolute',
            left: -30,
            bottom: -12,
          }}
        />
        <Text
          style={{
            color: 'rgba(255,255,255,.85)',
            fontSize: 11,
            fontWeight: '800',
            letterSpacing: 2,
          }}
        >
          {game.platform?.toUpperCase()}
        </Text>
        <Text style={{ fontSize: large ? 85 : 52, textAlign: 'center' }}>
          {game.icon || '🎮'}
        </Text>
        <Text
          numberOfLines={2}
          style={{
            color: '#FFF',
            fontWeight: '900',
            fontSize: large ? 21 : 15,
          }}
        >
          {game.title}
        </Text>
      </GameCover>
    </View>
  );
}

export function GameCard({ game, onPress }) {
  return (
    <Pressable
      testID={`game-${game.id}`}
      accessibilityRole="button"
      accessibilityLabel={`Ver jogo ${game.title}`}
      onPress={onPress}
      style={{
        width: '48%',
        ...(Platform.OS === 'web' ? { maxWidth: 300 } : {}),
        marginBottom: 17,
      }}
    >
      <Poster game={game} />
      <Text numberOfLines={1} style={[s.h3, { fontSize: 14, marginTop: 8 }]}>
        {game.title}
      </Text>
      <View style={[s.row, { marginTop: 2 }]}>
        <Text style={s.muted}>{game.genre}</Text>
        <Text style={{ color: colors.accent2, fontWeight: '800' }}>
          {money(game.priceCents)}
        </Text>
      </View>
    </Pressable>
  );
}

export function Notice({ text, type = 'error' }) {
  return text ? (
    <Text
      style={[
        s.error,
        { color: type === 'success' ? colors.success : colors.danger },
      ]}
    >
      {text}
    </Text>
  ) : null;
}

export function Tabs({ navigation, active, quantity = 0 }) {
  const tabs = [
    ['Home', 'home-outline', 'Início'],
    ['Catalog', 'grid-outline', 'Jogos'],
    ['Cart', 'bag-outline', quantity ? `Sacola (${quantity})` : 'Sacola'],
    ['Profile', 'person-outline', 'Perfil'],
  ];
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 12,
        paddingBottom: 10,
        borderTopWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
      }}
    >
      {tabs.map(([screen, icon, label]) => (
        <Pressable
          key={screen}
          accessibilityRole="tab"
          accessibilityLabel={label}
          onPress={() => navigation.navigate(screen)}
          style={{ alignItems: 'center', width: '23%', gap: 4 }}
        >
          <Ionicons
            name={icon}
            size={22}
            color={active === screen ? colors.accent2 : colors.muted}
          />
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: active === screen ? colors.accent2 : colors.muted,
            }}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
