import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const echostr = searchParams.get('echostr')

  if (!echostr) return NextResponse.json({ error: 'Missing echostr' }, { status: 400 })

  return new NextResponse(echostr, { headers: { 'Content-Type': 'text/plain' } })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()

    const openid = extractFromXml(body, 'FromUserName')
    const msgType = extractFromXml(body, 'MsgType')

    if (msgType === 'event') {
      const event = extractFromXml(body, 'Event')

      if (event === 'subscribe') {
        return new NextResponse(
          buildTextResponse(openid, extractFromXml(body, 'ToUserName'),
            `欢迎关注 TodoNow！\n\n请点击链接绑定账号：\n${process.env.NEXT_PUBLIC_SITE_URL}/settings?wechat_bind=${openid}`
          ),
          { headers: { 'Content-Type': 'application/xml' } }
        )
      }
    }

    if (msgType === 'text') {
      const content = extractFromXml(body, 'Content')
      if (content === '打卡') {
        return new NextResponse(
          buildTextResponse(openid, extractFromXml(body, 'ToUserName'),
            `请点击链接完成打卡：\n${process.env.NEXT_PUBLIC_SITE_URL}/wechat/checkin?openid=${openid}`
          ),
          { headers: { 'Content-Type': 'application/xml' } }
        )
      }
    }

    return new NextResponse('success')
  } catch (error) {
    console.error('WeChat callback error:', error)
    return new NextResponse('success')
  }
}

function extractFromXml(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}><!\\[CDATA\\[(.*?)\\]\\]></${tag}>`)
  const match = xml.match(regex)
  if (match) return match[1]

  const simpleRegex = new RegExp(`<${tag}>(.*?)</${tag}>`)
  const simpleMatch = xml.match(simpleRegex)
  return simpleMatch ? simpleMatch[1] : ''
}

function buildTextResponse(to: string, from: string, content: string): string {
  return `<xml>
<ToUserName><![CDATA[${to}]]></ToUserName>
<FromUserName><![CDATA[${from}]]></FromUserName>
<CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime>
<MsgType><![CDATA[text]]></MsgType>
<Content><![CDATA[${content}]]></Content>
</xml>`
}
