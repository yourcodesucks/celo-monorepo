import * as React from 'react'
import { withNamespaces } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
import CCLicense from 'src/brandkit/common/CCLicense'
import { brandStyles } from 'src/brandkit/common/constants'
import Fetch from 'src/brandkit/common/Fetch'
import Page from 'src/brandkit/common/Page'
import PageHeadline from 'src/brandkit/common/PageHeadline'
import Showcase from 'src/brandkit/common/Showcase'
import { H2 } from 'src/fonts/Fonts'
import { I18nProps, NameSpaces } from 'src/i18n'
import { hashNav } from 'src/shared/menu-items'
import Spinner from 'src/shared/Spinner'
import { colors, fonts, standardStyles } from 'src/styles'

const { brandImagery } = hashNav

const KeyImageryWrapped = React.memo(function KeyImagery() {
  return (
    <Page
      sections={[
        { id: brandImagery.overview, children: <Overview /> },
        { id: brandImagery.illustrations, children: <Illustrations /> },
        { id: brandImagery.graphics, children: <AbstractGraphics /> },
      ]}
    />
  )
})

export default KeyImageryWrapped

const Overview = React.memo(
  withNamespaces(NameSpaces.brand)(function _Overview({ t }: I18nProps) {
    return (
      <>
        <PageHeadline title={t('keyImagery.title')} headline={t('keyImagery.headline')} />
        <CCLicense textI18nKey="keyImagery.license" />
      </>
    )
  })
)

const Illustrations = React.memo(
  withNamespaces(NameSpaces.brand)(function _Illustrations({ t }: I18nProps) {
    return (
      <View style={[brandStyles.gap, standardStyles.blockMarginTopTablet]}>
        <H2 style={standardStyles.elementalMarginBottom}>{t('keyImagery.illoTitle')}</H2>
        <Text style={fonts.p}>{t('keyImagery.illoText')}</Text>
        <Fetch query="/brand/api/assets/Illustrations">
          {({ loading, data, error }) => {
            if (loading) {
              return <Loading />
            }

            if (error || data.length === 0) {
              return <SomethingsWrong />
            }

            return (
              <View style={brandStyles.tiling}>
                {data.map((illo) => (
                  <Showcase
                    ratio={1}
                    key={illo.name}
                    description={illo.description}
                    name={illo.name}
                    preview={{ uri: illo.preview }}
                    uri={illo.uri}
                    loading={false}
                    size={220}
                  />
                ))}
              </View>
            )
          }}
        </Fetch>
      </View>
    )
  })
)

const AbstractGraphics = React.memo(
  withNamespaces(NameSpaces.brand)(function _AbstractGraphics({ t }: I18nProps) {
    return (
      <View style={[brandStyles.gap, standardStyles.blockMarginTop]}>
        <H2 style={standardStyles.elementalMarginBottom}>{t('keyImagery.abstractTitle')}</H2>
        <Text style={fonts.p}>{t('keyImagery.abstractText')}</Text>
        <Fetch query="/brand/api/assets/Illustrations">
          {({ loading, data, error }) => {
            if (loading) {
              return <Loading />
            }

            if (error || data.length === 0) {
              return <SomethingsWrong />
            }

            return (
              <View style={brandStyles.tiling}>
                {data.map((illo) => (
                  <Showcase
                    ratio={344 / 172}
                    key={illo.name}
                    description={illo.description}
                    name={illo.name}
                    preview={{ uri: illo.preview }}
                    uri={illo.uri}
                    loading={false}
                    size={340}
                  />
                ))}
              </View>
            )
          }}
        </Fetch>
      </View>
    )
  })
)

function Loading() {
  return (
    <View style={[standardStyles.centered, styles.fillSpace]}>
      <Spinner color={colors.primary} size="medium" />
    </View>
  )
}

const SomethingsWrong = withNamespaces(NameSpaces.brand)(function _SomethingsWrong({ t }) {
  return (
    <View style={[standardStyles.centered, styles.fillSpace]}>
      <Text style={fonts.mini}>{t('keyImagery.errorMessage')}</Text>
    </View>
  )
})

const styles = StyleSheet.create({
  fillSpace: {
    minHeight: '60vh',
  },
})
