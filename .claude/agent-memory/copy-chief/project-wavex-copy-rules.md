---
name: project-wavex-copy-rules
description: Wavex Payments (landing em C:\tmp\wavex-site) — regras inegociáveis de copy, números permitidos, recursos citáveis/proibidos e voz dos 12 criativos
metadata:
  type: project
---
Landing da Wavex Payments (gateway/infra de pagamentos BR), layout modelado em zenithwld.com.br. A copy é entregue em slots com limite de caracteres; o dev monta o HTML. Primeira versão completa entregue em 2026-10-09.

Regras do dev/dono (o site vai pro ar):
- Zero depoimento inventado: a seção "avaliações" do Zenith virou "para quem é" (5 segmentos, frase da Wavex, sem nome/cargo/nota).
- Zero número, certificação ou prazo inventado (nada de PCI/ISO/SOC2, uptime, % de aprovação, D+X, taxa em %, nº de clientes/países). Números permitidos: 3 métodos, 1 API/integração, 1 painel, Pix 24/7.
- Métodos: Pix, cartão de crédito e boleto. Citáveis, mas pendentes de confirmação do dono: checkout, API REST, webhooks, antifraude, KYC no cadastro, painel em tempo real, app, saque via Pix, conciliação, parcelamento, LGPD. Proibidos: antecipação, split, cripto, internacional, multi-moeda.
- FAQ não inventa política ("depende do perfil", "fale com um especialista").

**Why:** o dono ainda não confirmou números nem políticas, e o site é público. Uma promessa inventada vira propaganda enganosa.
**How to apply:** toda copy nova da Wavex (ads, e-mail, página) segue essas regras. H2 em 2 linhas caixa alta (L2 violeta), cada uma com até 24 caracteres e ponto final. CTA da marca: "Escalar com a Wavex". Voz: estrutura/base/controle/escala, frases curtas, sem exclamação, "galera" ou "aí". Reaproveitar as headlines dos criativos ajuda a página a bater com o anúncio. Checar limites com script (len em NFC) e testar o checker por mutação.
