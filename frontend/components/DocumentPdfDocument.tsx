import { Document, Font, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { DocumentFields, RenderedDocument, Run } from "@/lib/document-types";
import { DOCUMENT_DISCLAIMER, fieldDisplayValue, partyDisplayName } from "@/lib/document-render";

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
  bold: {
    fontFamily: "NotoSans",
    fontWeight: 700,
  },
  placeholder: {
    color: "#9ca3af",
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

function RunText({ run }: { run: Run }) {
  if (run.type === "field") {
    const filled = Boolean(run.value.trim());
    return <Text style={filled ? undefined : styles.placeholder}>{fieldDisplayValue(run)}</Text>;
  }
  if (run.type === "link") {
    return (
      <Link src={run.href} style={run.bold ? styles.bold : undefined}>
        {run.text}
      </Link>
    );
  }
  return <Text style={run.bold ? styles.bold : undefined}>{run.text}</Text>;
}

export default function DocumentPdfDocument({
  document,
  fields,
}: {
  document: RenderedDocument;
  fields: DocumentFields;
}) {
  return (
    <Document title={document.name}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{document.name.toUpperCase()}</Text>

        {document.blocks.map((block, index) => (
          <View key={index} style={{ marginLeft: block.level * 14 }}>
            <Text style={styles.paragraph}>
              {block.marker && <Text>{block.marker} </Text>}
              {block.heading && <Text style={styles.bold}>{block.heading}. </Text>}
              {block.runs.map((run, runIndex) => (
                <RunText key={runIndex} run={run} />
              ))}
            </Text>
          </View>
        ))}

        <View style={styles.signatureRow}>
          {(["party_a_name", "party_b_name"] as const).map((key, index) => (
            <View key={key} style={styles.signatureBlock}>
              <Text style={styles.signatureName}>
                {partyDisplayName(fields, key, `Party ${index === 0 ? "A" : "B"}`)}
              </Text>
              <Text style={styles.signatureLine}>Signature: ____________________</Text>
              <Text style={styles.signatureLine}>Date: ____________________</Text>
            </View>
          ))}
        </View>

        <Text style={styles.disclaimer}>{DOCUMENT_DISCLAIMER}</Text>
      </Page>
    </Document>
  );
}
