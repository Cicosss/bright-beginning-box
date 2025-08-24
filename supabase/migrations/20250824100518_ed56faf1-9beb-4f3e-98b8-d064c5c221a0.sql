-- Insert example customers
INSERT INTO public.customers (name, address, email, phone) VALUES 
('Tech Solutions Srl', 'Via Roma 1, Milano', 'info@techsolutions.it', '02-1234567'),
('Creative Minds Agency', 'Corso Vittorio Emanuele 10, Torino', 'contact@creativeminds.it', '011-9876543'),
('Global Imports', 'Piazza del Popolo 5, Roma', 'sales@globalimports.it', '06-5555555'),
('Ufficio Stampa', 'Via della Conciliazione, Roma', 'press@ufficiostampa.it', '06-7777777'),
('Studio Legale & Associati', 'Via Montenapoleone 2, Milano', 'info@studiolegale.it', '02-9999999'),
('Ospedale San Raffaele', 'Via Olgettina 60, Milano', 'acquisti@hsr.it', '02-2643-1')
ON CONFLICT DO NOTHING;

-- Insert example products
INSERT INTO public.products (name, description, sku) VALUES 
('Laptop Pro 15"', 'Laptop professionale 15 pollici con processore Intel i7', 'LAP-PRO-15'),
('Mouse Wireless', 'Mouse wireless ergonomico con batteria ricaricabile', 'MOU-WIR-01'),
('Monitor 27" 4K', 'Monitor 27 pollici risoluzione 4K per uso professionale', 'MON-27-4K'),
('Tastiera Meccanica RGB', 'Tastiera meccanica con retroilluminazione RGB', 'KEY-MECH-RGB'),
('Webcam HD', 'Webcam HD 1080p per videoconferenze', 'CAM-HD-1080'),
('Stampante Laser', 'Stampante laser monocromatica professionale', 'PRI-LAS-BW'),
('Scanner Professionale', 'Scanner A4 fronte/retro alta velocità', 'SCA-PRO-A4'),
('Cavi HDMI 10m', 'Cavo HDMI 2.0 lunghezza 10 metri', 'CBL-HDMI-10M'),
('Hub USB-C', 'Hub USB-C con 7 porte e ricarica rapida', 'HUB-USBC-7'),
('SSD Esterno 1TB', 'SSD esterno portatile 1TB USB 3.0', 'SSD-EXT-1TB')
ON CONFLICT DO NOTHING;