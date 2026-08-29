# UroLOG Google Takvim Entegrasyon Rehberi

UroLOG sistemindeki randevuların Google Takvim'inizle senkronize edilebilmesi için Google Cloud üzerinden bir API projesi oluşturmanız ve yetkilendirme (OAuth) bilgilerini sisteme girmeniz gerekmektedir. 

Aşağıdaki adımları (Google Cloud'un İngilizce arayüzüne göre) sırasıyla takip ederek entegrasyonu tamamlayabilirsiniz.

---

## Adım 1: Google Cloud Projesi Oluşturma

1. Tarayıcınızdan [Google Cloud Console](https://console.cloud.google.com/) adresine gidin.
2. Sağ üst köşedeki **Select a project** (Proje Seçin) menüsüne, ardından açılan pencerede sağ üstteki **New Project** (Yeni Proje) butonuna tıklayın.
3. Proje adını `UroLOG-Calendar` (veya dilediğiniz bir isim) olarak belirleyin ve **Create** (Oluştur) butonuna tıklayın.
4. Proje oluşturulduktan sonra üst menüden bu projeyi seçtiğinizden emin olun.

---

## Adım 2: Google Calendar API'sini Aktifleştirme

1. Sol menüden sırasıyla **APIs & Services** (API'ler ve Hizmetler) > **Library** (Kitaplık) sekmesine gidin.
2. Arama çubuğuna **Google Calendar API** yazın ve çıkan sonuca tıklayın.
3. **Enable** (Etkinleştir) butonuna basarak API'yi projeniz için aktifleştirin.

---

## Adım 3: Google Auth Platform Ayarlarını Yapılandırma

Google Cloud'un yeni tasarımlı **Google Auth Platform** arayüzü sol menüde yer almaktadır. Sol menüden **APIs & Services** > **OAuth consent screen** (veya **Google Auth Platform**) sekmesine tıklayın.

### A. Branding (Uygulama Bilgileri)
1. Sol menüden **Branding** sekmesine girin.
2. Gerekli alanları doldurun:
   - **App name (Uygulama Adı):** `UroLOG Web Client`
   - **User support email (Kullanıcı destek e-postası):** Kendi Google e-posta adresinizi seçin.
   - **Developer contact information (Geliştirici iletişim bilgileri):** Kendi e-posta adresinizi yazın.
3. Sayfanın altındaki **Save** (Kaydet) veya **Save and Continue** butonuna tıklayın.

### B. Data Access (Kapsamlar / Scopes)
1. Sol menüden **Data Access** sekmesine gidin.
2. Sayfanın üstündeki **Add or Remove Scopes** (Kapsam Ekle veya Kaldır) butonuna tıklayın. Açılan sağ panelde:
   - Listenin en altına kaydırın.
   - **Manually add scopes** (Kapsamları manuel olarak ekle) metin kutusuna sırasıyla aşağıdaki iki URL'i ekleyin:
     ```text
     https://www.googleapis.com/auth/calendar.events
     https://www.googleapis.com/auth/calendar
     ```
   - **Add to table** (Tabloya ekle) butonuna tıklayın.
   - Panelin en altındaki mavi **Update** (Güncelle) butonuna tıklayın.
3. Sayfanın altındaki **Save** butonuna basarak devam edin.

### C. Audience (Test Kullanıcıları)
Uygulama henüz yayına alınıp Google tarafından doğrulanmadığı için test aşamasında sadece buraya ekleyeceğiniz hesaplar takvim bağlayabilir.
1. Sol menüden **Audience** sekmesine gidin.
2. **User type** (Kullanıcı tipi) kısmını **External** (Harici) olarak seçin (varsayılan değilse).
3. Sayfanın altındaki **Test users** başlığından **+ Add Users** butonuna tıklayın.
4. **Kendi Google e-posta adresinizi** (Takvimini bağlayacağınız hesabı) yazın ve **Save** deyin.

---

## Adım 4: Kimlik Belgelerini (OAuth Client ID) Oluşturma

1. Sol menüden **Clients** (veya **APIs & Services > Credentials**) sekmesine gidin.
2. Üst menüden **+ Create Client** (veya **+ Create Credentials > OAuth client ID**) butonuna tıklayın.
3. **Application type** (Uygulama türü) olarak **Web application** (Web uygulaması) seçin.
4. **Name** (İsim) kısmına `UroLOG Web` yazın.
5. **Authorized redirect URIs** (Yetkilendirilmiş yönlendirme URI'leri) kısmında **+ Add URI** butonuna tıklayarak aşağıdaki callback adresini girin:
   - `http://localhost:8000/api/v1/integrations/google/callback`
   *(Not: Prodüksiyon (canlı) ortamında bu adres `https://alanadiniz.com/api/v1/integrations/google/callback` şeklinde güncellenmelidir).*
6. Sayfanın en altındaki **Save** (veya **Create**) butonuna tıklayın.

---

## Adım 5: ID ve Secret Bilgilerini UroLOG'a Kaydetme

Oluşturma işlemi tamamlandığında Google size bir pencere içinde iki anahtar sunacaktır:
1. **Client ID** (İstemci Kimliği)
2. **Client Secret** (İstemci Gizli Anahtarı)

Bu iki bilgiyi kopyalayın ve UroLOG uygulamasında:
1. **Ayarlar > Entegrasyonlar** sekmesine gidin.
2. Google Calendar kartındaki **Client ID** ve **Client Secret** alanlarına yapıştırarak **Kimlik Bilgilerini Kaydet** butonuna basın.
3. Bilgiler kaydedildikten sonra aktifleşen **Google ile Bağlan** butonuna basarak Google hesabınızı onaylayın ve senkronizasyonu tamamlayın!
