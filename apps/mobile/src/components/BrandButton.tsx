/**
 * Brand button for Cromos 26. Three variants:
 *   primary — green bg + gold border + white text. Default CTA.
 *   gold    — gold bg + red text. Used on red surfaces (Extras hero).
 *   outline — paper bg + green border. Secondary action.
 *
 * Optional leading/trailing icon. Disabled state dims to 0.5.
 */
import { ReactNode } from 'react'
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View, ViewStyle, StyleProp } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '@/lib/theme'

type Variant = 'primary' | 'gold' | 'outline'
type Size = 'sm' | 'md' | 'lg'

interface Props {
  label: string
  onPress: () => void
  variant?: Variant
  size?: Size
  leadingIcon?: keyof typeof Ionicons.glyphMap
  trailingIcon?: keyof typeof Ionicons.glyphMap
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  style?: StyleProp<ViewStyle>
}

const SIZES: Record<Size, { padV: number; padH: number; font: number; iconSize: number }> = {
  sm: { padV: 8, padH: 12, font: 12, iconSize: 14 },
  md: { padV: 12, padH: 16, font: 14, iconSize: 16 },
  lg: { padV: 16, padH: 20, font: 15, iconSize: 18 },
}

export function BrandButton({
  label, onPress,
  variant = 'primary', size = 'md',
  leadingIcon, trailingIcon,
  loading = false, disabled = false,
  fullWidth = false, style,
}: Props): ReactNode {
  const sizeStyle = SIZES[size]
  const isDisabled = disabled || loading
  const fg =
    variant === 'gold'    ? COLORS.red :
    variant === 'outline' ? COLORS.green :
                            COLORS.paper

  const surfaceStyle =
    variant === 'gold'    ? s.gold :
    variant === 'outline' ? s.outline :
                            s.primary

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      disabled={isDisabled}
      style={[
        s.base,
        surfaceStyle,
        { paddingVertical: sizeStyle.padV, paddingHorizontal: sizeStyle.padH },
        fullWidth && { alignSelf: 'stretch' },
        isDisabled && s.disabled,
        style,
      ]}
    >
      <View style={s.row}>
        {loading ? (
          <ActivityIndicator size="small" color={fg} />
        ) : (
          <>
            {leadingIcon && <Ionicons name={leadingIcon} size={sizeStyle.iconSize} color={fg} />}
            <Text style={[s.label, { fontSize: sizeStyle.font, color: fg }]}>{label}</Text>
            {trailingIcon && <Ionicons name={trailingIcon} size={sizeStyle.iconSize} color={fg} />}
          </>
        )}
      </View>
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  base: {
    borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
  },
  label: {
    fontWeight: FONT.weight.black,
  },
  primary: {
    backgroundColor: COLORS.green,
    borderWidth: 2, borderColor: COLORS.gold,
    ...SHADOW.sm,
  },
  gold: {
    backgroundColor: COLORS.gold,
    ...SHADOW.sm,
  },
  outline: {
    backgroundColor: COLORS.paper,
    borderWidth: 1.5, borderColor: COLORS.green,
  },
  disabled: { opacity: 0.5 },
})
