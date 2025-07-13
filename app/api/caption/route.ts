export async function POST(req: Request) {
  const body = await req.json();

  const params = new URLSearchParams();
  params.append("template_id", body.template_id);
  params.append("username", process.env.IMGFLIP_USERNAME!);
  params.append("password", process.env.IMGFLIP_PASSWORD!);
  body.boxes.forEach((text: string, index: number) => {
    params.append(`boxes[${index}][text]`, text);
  });

  const res = await fetch("https://api.imgflip.com/caption_image", {
    method: "POST",
    body: params,
  });
  const data = await res.json();
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}
