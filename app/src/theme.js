import { StyleSheet } from 'react-native';

export const colors = {
  bg: '#0D101B',
  surface: '#171B2A',
  surface2: '#22283A',
  accent: '#8F6BFF',
  accent2: '#BBA6FF',
  text: '#F6F7FF',
  muted: '#A3ACC5',
  border: '#303649',
  success: '#5BDC9C',
  danger: '#FF7383',
  gold: '#F8C770',
};
export const money = (n = 0) =>
  `R$ ${(Number(n) / 100).toFixed(2).replace('.', ',')}`;
export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 34 },
  h1: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -1,
  },
  h2: { fontSize: 22, fontWeight: '800', color: colors.text },
  h3: { fontSize: 17, fontWeight: '800', color: colors.text },
  body: { fontSize: 15, color: colors.text, lineHeight: 22 },
  muted: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    color: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    minHeight: 48,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
  tag: {
    fontSize: 11,
    color: colors.accent2,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  spacer: { height: 18 },
  error: { color: colors.danger, marginBottom: 12, fontSize: 13 },
});
