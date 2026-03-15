import { joinColoringPageEmailList } from '@/app/actions/email';

export const POST = async (request: Request) => {
  const { email } = await request.json();

  if (!email) {
    return Response.json(
      { error: 'Email is required' },
      {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      },
    );
  }

  try {
    const formData = new FormData();
    formData.append('email', email);

    await joinColoringPageEmailList(
      {
        success: false,
      },
      formData,
    );

    return Response.json(
      { result: 'Successfully added to the list.' },
      {
        status: 200,
      },
    );
  } catch (error) {
    return Response.json(
      { error: 'Failed to add to the list', details: error },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      },
    );
  }
};
