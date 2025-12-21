'use server';

import mailchimp from '@mailchimp/mailchimp_marketing';
import { Readable } from 'stream';
import { GenerationType, ColoringImage } from '@chunky-crayon/db';
import generatePDFNode from '@/utils/generatePDFNode';
import streamToBuffer from '@/utils/streamToBuffer';
import fetchSvg from '@/utils/fetchSvg';
import { sendEmail } from '@/utils/email';

mailchimp.setConfig({
  apiKey: process.env.MAILCHIMP_API_KEY,
  server: process.env.MAILCHIMP_API_SERVER,
});

type JoinColoringPageEmailListState = {
  success: boolean;
  error?: unknown;
  email?: string;
};

export const joinColoringPageEmailList = async (
  previousState: JoinColoringPageEmailListState,
  formData: FormData,
): Promise<JoinColoringPageEmailListState> => {
  const rawFormData = {
    email: (formData.get('email') as string) || '',
  };

  try {
    await mailchimp.lists.addListMember(
      // process.env.MAILCHIMP_AUDIENCE_ID as string,
      '52c8855495',
      {
        email_address: rawFormData.email,
        status: 'subscribed',
      },
    );

    return {
      success: true,
      email: rawFormData.email,
    };
  } catch (error) {
    console.error({ mailchimpError: error });

    return {
      error: 'Failed to add email to mailchimp list',
      success: false,
    };
  }
};

export const getMailchimpAudienceMembers = async () => {
  const response = await mailchimp.lists.getListMembersInfo(
    // process.env.MAILCHIMP_AUDIENCE_ID as string,
    '52c8855495',
  );

  if ('members' in response) {
    return response.members;
  }

  throw new Error('Failed to get Mailchimp audience members');
};

// Separate function to send email for a specific coloring image
export const sendColoringImageEmail = async (
  coloringImage: Partial<ColoringImage>,
  generationType: GenerationType,
  customEmails?: string[],
): Promise<void> => {
  if (!coloringImage.svgUrl || !coloringImage.qrCodeUrl) {
    throw new Error('Coloring image URLs are required for email sending');
  }

  const imageSvg = await fetchSvg(coloringImage.svgUrl);
  const qrCodeSvg = await fetchSvg(coloringImage.qrCodeUrl);

  const pdfStream = await generatePDFNode(coloringImage, imageSvg, qrCodeSvg);

  // convert PDF stream to buffer
  const pdfBuffer = await streamToBuffer(pdfStream as Readable);

  // use custom emails if provided, otherwise get from mailchimp
  let emails: string[];

  if (customEmails) {
    emails = customEmails;
  } else {
    // get list of emails from mailchimp
    const members = await getMailchimpAudienceMembers();
    emails = members.map(
      (member: { email_address: string }) => member.email_address,
    );
  }

  // send email to all emails in the list with the coloring image as an attachment pdf
  await sendEmail({
    to: emails,
    coloringImagePdf: pdfBuffer,
    generationType,
  });
};
