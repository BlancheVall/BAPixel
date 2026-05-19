import Link from "next/link";

const supportEmail = "blanche.awang1@gmail.com";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0e1220] px-6 py-10 text-[#eadfca]">
      <div className="mx-auto max-w-3xl space-y-8">
        <Link href="/" className="text-sm font-semibold text-[#c69a4a] hover:text-[#f0c36e]">
          返回生成器 / Back to generator
        </Link>

        <section className="space-y-3">
          <h1 className="text-3xl font-bold text-[#fff2d4]">服务条款 / Terms of Service</h1>
          <p className="text-sm leading-6 text-[#b8aa92]">
            本网站允许用户使用 Point 点数生成 AI 像素角色图片。你需要对自己输入的提示词和上传的参考图片负责，
            请不要上传你无权使用、侵犯他人权利或违反法律法规的内容。
          </p>
          <p className="text-sm leading-6 text-[#b8aa92]">
            生成图片按现状提供。AI 结果可能存在不稳定、不准确、不符合预期等情况。对于滥用服务、侵犯权利、
            试图绕过限制或影响服务稳定性的请求，我们可能会限制、拒绝或暂停处理。
          </p>
          <p className="text-sm leading-6 text-[#b8aa92]">
            This site lets users generate AI pixel character sprites using Point credits. You are responsible for the
            prompts and reference images you upload, and you must not upload content you do not have the right to use.
          </p>
          <p className="text-sm leading-6 text-[#b8aa92]">
            Generated images are provided as-is. AI output can be imperfect, inconsistent, or unsuitable for a specific
            use. We may limit or refuse requests that abuse the service, violate rights, or attempt to bypass usage
            limits.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[#fff2d4]">价格与 Point / Pricing and Points</h2>
          <p className="text-sm leading-6 text-[#b8aa92]">
            普通生成消耗 1 Point。上传角色参考图会额外消耗 1 Point。使用画风模板会额外消耗 2 Point。
            当前套餐为 30 Point / 1.90 美元、300 Point / 9.90 美元、800 Point / 19.90 美元。
            Point 是本网站内使用的数字点数，不是现金、储值卡或可提现余额。
          </p>
          <p className="text-sm leading-6 text-[#b8aa92]">
            Standard generation costs 1 Point. Uploading a character reference costs 1 extra Point. Using a style
            template costs 2 extra Points. Current packages are 30 Points for $1.90, 300 Points for $9.90, and 800
            Points for $19.90. Points are digital credits for this service and are not cash or stored value.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[#fff2d4]">退款政策 / Refund Policy</h2>
          <p className="text-sm leading-6 text-[#b8aa92]">
            如果你已经付款但 Point 没有到账，请使用账号邮箱和 Stripe 收据联系我们。我们会在核实付款后手动补发
            缺失的 Point。已使用的 Point、或仅因生成结果不符合主观预期而提出的退款，会根据具体情况单独审核。
          </p>
          <p className="text-sm leading-6 text-[#b8aa92]">
            If you paid but Points were not added, contact support with your account email and Stripe receipt. We can
            manually add missing Points after verifying the payment. Refunds for used Points or subjective generation
            results are reviewed case by case.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[#fff2d4]">隐私政策 / Privacy Policy</h2>
          <p className="text-sm leading-6 text-[#b8aa92]">
            我们会保存账号信息、Point 余额、购买记录、提示词、生成图片链接以及近期生成历史。你上传的角色参考图
            会被用于分析角色特征和生成图片，并可能发送给 AI 服务提供商用于完成该次生成请求。
          </p>
          <p className="text-sm leading-6 text-[#b8aa92]">
            作品集图片默认在应用内保留 7 天，除非你提前删除。支付信息由 Stripe 处理；本网站不会保存完整银行卡号。
            我们会尽量保护你的数据安全，但互联网服务无法保证绝对安全。
          </p>
          <p className="text-sm leading-6 text-[#b8aa92]">
            We store account details, Point balances, purchase records, prompts, generated image URLs, and recent
            generation history. Uploaded reference images are processed to generate output and may be sent to AI service
            providers for that purpose.
          </p>
          <p className="text-sm leading-6 text-[#b8aa92]">
            Portfolio images are kept for 7 days in the app unless deleted earlier. Payment details are handled by
            Stripe; this site does not store full card numbers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[#fff2d4]">联系 / Contact</h2>
          <p className="text-sm leading-6 text-[#b8aa92]">
            如果遇到付款、账号、Point、生成失败或退款问题，请联系{" "}
            <a href={`mailto:${supportEmail}`} className="font-semibold text-[#c69a4a] hover:text-[#f0c36e]">
              {supportEmail}
            </a>
            。
          </p>
          <p className="text-sm leading-6 text-[#b8aa92]">
            For payment, account, or generation issues, contact{" "}
            <a href={`mailto:${supportEmail}`} className="font-semibold text-[#c69a4a] hover:text-[#f0c36e]">
              {supportEmail}
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
