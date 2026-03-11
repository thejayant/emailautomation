import { z } from "zod";

export const authSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export const emailOnlySchema = z.object({
  email: z.email(),
  password: z.string().optional(),
});

export const profileSchema = z.object({
  fullName: z.string().min(2).max(100),
  title: z.string().max(120).optional().or(z.literal("")),
});

export const templateSchema = z.object({
  name: z.string().min(2).max(80),
  subjectTemplate: z.string().min(3).max(180),
  bodyTemplate: z.string().min(10),
});

export const manualContactSchema = z.object({
  email: z.email(),
  firstName: z.string().max(120).optional().or(z.literal("")),
  lastName: z.string().max(120).optional().or(z.literal("")),
  company: z.string().max(160).optional().or(z.literal("")),
  website: z.string().max(255).optional().or(z.literal("")),
  jobTitle: z.string().max(160).optional().or(z.literal("")),
});

export const campaignLaunchSchema = z.object({
  campaignName: z.string().min(2).max(120),
  gmailAccountId: z.string().uuid(),
  contactListId: z.string().uuid().optional().or(z.literal("")),
  targetContactIds: z.array(z.string().uuid()).min(1),
  timezone: z.string().min(2),
  sendWindowStart: z.string().regex(/^\d{2}:\d{2}$/),
  sendWindowEnd: z.string().regex(/^\d{2}:\d{2}$/),
  dailySendLimit: z.coerce.number().int().min(1).max(500),
  primarySubject: z.string().min(3),
  primaryBody: z.string().min(10),
  followupSubject: z.string().min(3),
  followupBody: z.string().min(10),
});

export const googleSheetsImportSchema = z.object({
  url: z.url(),
});

export const customCrmPayloadSchema = z.object({
  workspaceId: z.string().uuid(),
  externalSource: z.string().min(2),
  contacts: z.array(
    z.object({
      externalContactId: z.string().min(1),
      email: z.email(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      company: z.string().optional(),
      website: z.string().optional(),
      jobTitle: z.string().optional(),
      customFields: z
        .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
        .optional(),
    }),
  ),
});

export const pauseCampaignSchema = z.object({
  campaignId: z.string().uuid(),
  status: z.enum(["paused", "active"]),
});

export const sendNowCampaignSchema = z.object({
  campaignId: z.string().uuid(),
});

export const resendCampaignContactSchema = z.object({
  campaignContactId: z.string().uuid(),
});

export const inboxReplySchema = z.object({
  threadRecordId: z.string().uuid(),
  body: z.string().min(3),
});
