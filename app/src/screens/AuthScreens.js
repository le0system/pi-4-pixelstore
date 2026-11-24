import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../AuthContext';
import { Page, Btn, Field, Notice } from '../components';
import { colors, s } from '../theme';

function Logo() {
  return (
    <View style={{ alignItems: 'center', marginVertical: 30 }}>
      <View
        style={{
          width: 90,
          height: 90,
          backgroundColor: colors.accent,
          borderRadius: 28,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 18,
        }}
      >
        <Ionicons name="game-controller" size={51} color="#FFF" />
      </View>
      <Text style={[s.h1, { fontSize: 36 }]}>
        PIXEL<Text style={{ color: colors.accent2 }}>STORE</Text>
      </Text>
      <Text style={[s.muted, { marginTop: 7 }]}>
        Seu próximo mundo começa aqui.
      </Text>
    </View>
  );
}

export function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!email.includes('@') || !password) {
      setError('Preencha e-mail e senha válidos.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Page>
      <Logo />
      <Text style={[s.h2, { marginBottom: 7 }]}>Boas-vindas de volta</Text>
      <Text style={[s.muted, { marginBottom: 26 }]}>
        Entre para explorar os melhores jogos.
      </Text>
      <Field
        testID="login-email"
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        placeholder="seu@email.com"
        keyboardType="email-address"
      />
      <Field
        testID="login-password"
        label="Senha"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholder="Sua senha"
      />
      <Notice text={error} />
      <Btn
        testID="login-submit"
        label="Entrar na Pixel Store"
        loading={loading}
        onPress={submit}
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate('Signup')}
        style={{ padding: 20, alignItems: 'center' }}
      >
        <Text style={s.muted}>
          Não tem conta?{' '}
          <Text style={{ color: colors.accent2, fontWeight: '900' }}>
            Cadastre-se
          </Text>
        </Text>
      </Pressable>
      <Text style={[s.muted, { textAlign: 'center', marginTop: 35 }]}>
        Projeto acadêmico • Não realiza venda real de licenças.
      </Text>
    </Page>
  );
}

export function SignupScreen({ navigation }) {
  const { signup } = useAuth();
  const [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(false);
  const submit = async () => {
    if (
      name.trim().length < 3 ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      password.length < 8 ||
      password !== confirm
    ) {
      setError(
        'Informe nome (3+), e-mail válido e senha (8+) idêntica à confirmação.',
      );
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signup(name, email, password);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Page>
      <Pressable
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        style={{ padding: 8, alignSelf: 'flex-start' }}
      >
        <Ionicons name="arrow-back" color={colors.text} size={23} />
      </Pressable>
      <Logo />
      <Text style={[s.h2, { marginBottom: 22 }]}>Crie sua conta</Text>
      <Field
        label="Nome completo"
        value={name}
        onChangeText={setName}
        placeholder="Seu nome"
        testID="signup-name"
      />
      <Field
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        placeholder="seu@email.com"
        keyboardType="email-address"
        testID="signup-email"
      />
      <Field
        label="Senha"
        value={password}
        onChangeText={setPassword}
        placeholder="No mínimo 8 caracteres"
        secureTextEntry
        testID="signup-password"
      />
      <Field
        label="Confirmar senha"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        placeholder="Repita a senha"
      />
      <Notice text={error} />
      <Btn
        label="Criar conta"
        loading={loading}
        onPress={submit}
        testID="signup-submit"
      />
    </Page>
  );
}
