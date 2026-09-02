/** JSON Schema для strict mode OpenAI — заключение аудита в стиле референса. */
export const AUDIT_HR_REPORT_JSON_SCHEMA = {
  name: "audit_hr_report",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      intelligenceVerdict: { type: "string" },
      motivationCommentary: { type: "string" },
      psychotypeRealization: { type: "string" },
      methodologyInsights: {
        type: "array",
        items: { type: "string" },
      },
      risksAndAdditional: { type: "string" },
      yearOverYearDynamics: { type: "string" },
      managerBriefConclusion: { type: "string" },
    },
    required: [
      "intelligenceVerdict",
      "motivationCommentary",
      "psychotypeRealization",
      "methodologyInsights",
      "risksAndAdditional",
      "yearOverYearDynamics",
      "managerBriefConclusion",
    ],
  },
} as const;

export const OPENAI_AUDIT_HR_RESPONSE_FORMAT = {
  type: "json_schema" as const,
  json_schema: AUDIT_HR_REPORT_JSON_SCHEMA,
};
