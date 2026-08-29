import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { NdaFormData } from "@/lib/types";
import {
  NDA_DISCLAIMER,
  NDA_TITLE,
  getIntroParagraph,
  getNdaSections,
} from "@/lib/nda-template";

const styles = StyleSheet.create({
  page: {
    padding: 56,
    fontSize: 10.5,
    fontFamily: "Helvetica",
    lineHeight: 1.5,
    color: "#1f2937",
  },
  title: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
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
    fontFamily: "Helvetica-Bold",
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
    fontFamily: "Helvetica-Bold",
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
            <Text style={styles.signatureName}>{data.partyA.name.trim() || "Party A"}</Text>
            <Text style={styles.signatureLine}>Signature: ____________________</Text>
            <Text style={styles.signatureLine}>Date: ____________________</Text>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureName}>{data.partyB.name.trim() || "Party B"}</Text>
            <Text style={styles.signatureLine}>Signature: ____________________</Text>
            <Text style={styles.signatureLine}>Date: ____________________</Text>
          </View>
        </View>

        <Text style={styles.disclaimer}>{NDA_DISCLAIMER}</Text>
      </Page>
    </Document>
  );
}
