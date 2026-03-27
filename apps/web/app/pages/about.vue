<template>
  <div>
    <h2 class="gc-page-title"><Info class="gc-icon gc-icon--title" /> About</h2>
    <section class="gc-section-surfaced">
      <h3 class="gc-section-title">What is MonaCube ?</h3>
      <p>MonaCube はモナコインによるチップ機能を内蔵したイラストプラットフォームです。</p>
    </section>

    <section class="gc-section-surfaced">
      <h3 class="gc-section-title">Key Features</h3>
      <ul>
        <li class="lc-feature-topli">
          Passkey ウォレットによるログイン
          <ul>
            <li>パスワード不要で安全・簡単にログインできます。</li>
            <li>Passkey から生成したノンカストディアルウォレットを提供します。</li>
          </ul>
        </li>
        <li class="lc-feature-topli">
          モナコイン残高による投稿クォータ解放
          <ul>
            <li>保有しているモナコインの量に応じて投稿可能な容量が増加します。</li>
            <li>チップを通じて金銭以外の面でもクリエイターを支援できます。</li>
            <li>不正な投稿・工作を抑制して、快適なプラットフォームを維持します。</li>
          </ul>
        </li>
      </ul>
    </section>

    <section class="gc-section-surfaced">
      <h3 class="gc-section-title">About this project</h3>
      <p>MonaCube は個人が開発・運営しています。</p>
      <p>Monacoin の文化やコミュニティとの相性を意識しながら、 シンプルで持続可能なプラットフォームを目指しています。</p>
    </section>

    <section class="gc-section-surfaced">
      <h3 class="gc-section-title">External Services</h3>
      <p>MonaCube は無償で運営されている外部のモナコイン関連サービスを利用しています。</p>
      <ul>
        <li class="lc-extservices-topli">
          Monacoin Explorers
          <ul>
            <li>
              <a href="https://esplora.electrum-mona.org/" target="_blank" rel="noopener noreferrer">
                esplora.electrum-mona.org <ExternalLink class="gc-icon" />
              </a>
              <div class="lc-extservices-note">脇山珠美ちゃんかわいい！ (特有のクレジット表記)</div>
            </li>
          </ul>
        </li>
        <li class="lc-extservices-topli">
          Monaparty Servers
          <ul>
            <li>
              <a href="https://monapa.electrum-mona.org/" target="_blank" rel="noopener noreferrer">
                monapa.electrum-mona.org <ExternalLink class="gc-icon" />
              </a>
            </li>
            <li>
              <a href="https://wallet.monaparty.me/" target="_blank" rel="noopener noreferrer">
                wallet.monaparty.me <ExternalLink class="gc-icon" />
              </a>
            </li>
          </ul>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Info, ExternalLink } from 'lucide-vue-next'
</script>

<style lang="scss" scoped>
.lc-feature-topli {
  margin-block: var(--space-4);
}

.lc-extservices-topli {
  margin-block: var(--space-4);
}

.lc-extservices-title {
  margin: 0;
}

.lc-extservices-note {
  color: var(--color-muted);
}
</style>
