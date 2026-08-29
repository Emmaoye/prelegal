import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { NdaFormData } from "@/lib/types";
import {
  NDA_DISCLAIMER,
  NDA_TITLE,
  getIntroParagraph,
  getNdaSections,
  getPartyDisplayName,
} from "@/lib/nda-template";

// react-pdf's built-in "Helvetica" only supports WinAnsi (Latin-1) encoding -
// any character outside that range (Cyrillic, Greek, Vietnamese, etc.)
// renders as garbled mojibake rather than an error. Noto Sans covers those
// scripts (though not CJK/Arabic/etc. - see hasUnsupportedPdfCharacters,
// which warns the user in that case instead of silently corrupting text).
Font.register({
  family: "NotoSans",
  fonts: [
    { src: "/fonts/NotoSans-Variable.ttf", fontWeight: 400 },
    { src: "/fonts/NotoSans-Variable.ttf", fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 56,
    fontSize: 10.5,
    fontFamily: "NotoSans",
    lineHeight: 1.5,
    color: "#1f2937",
  },
  title: {
    fontSize: 15,
    fontFamily: "NotoSans",
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  paragraph: {
    marginBottom: 10,
    textAlign: "justify",
  },
  heading: {
    fontSize: 11,
    fontFamily: "NotoSans",
    fontWeight: 700,
    marginTop: 4,
    marginBottom: 4,
  },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 36,
  },
  signatureBlock: {
    width: "45%",
    borderTopWidth: 1,
    borderTopColor: "#9ca3af",
    paddingTop: 6,
  },
  signatureName: {
    fontFamily: "NotoSans",
    fontWeight: 700,
    marginBottom: 16,
  },
  signatureLine: {
    marginTop: 14,
    color: "#6b7280",
  },
  disclaimer: {
    marginTop: 32,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    fontSize: 8,
    color: "#9ca3af",
  },
});

export default function NdaPdfDocument({ data }: { data: NdaFormData }) {
  const sections = getNdaSections(data);

  return (
    <Document title={NDA_TITLE}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{NDA_TITLE}</Text>
        <Text style={styles.paragraph}>{getIntroParagraph(data)}</Text>

        {sections.map((section) => (
          <View key={section.heading}>
            <Text style={styles.heading}>{section.heading}</Text>
            <Text style={styles.paragraph}>{section.body}</Text>
          </View>
        ))}

        <View style={styles.signatureRow}>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureName}>{getPartyDisplayName(data.partyA, "A")}</Text>
            <Text style={styles.signatureLine}>Signature: ____________________</Text>
            <Text style={styles.signatureLine}>Date: ____________________</Text>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureName}>{getPartyDisplayName(data.partyB, "B")}</Text>
            <Text style={styles.signatureLine}>Signature: ____________________</Text>
            <Text style={styles.signatureLine}>Date: ____________________</Text>
          </View>
        </View>

        <Text style={styles.disclaimer}>{NDA_DISCLAIMER}</Text>
      </Page>
    </Document>
  );
}
