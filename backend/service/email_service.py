import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from datetime import datetime
from typing import Optional

class EmailService:
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.smtp_from = os.getenv("SMTP_FROM")
        self.smtp_timeout = int(os.getenv("SMTP_TIMEOUT", "30"))

        print("[EMAIL] Inicializando EmailService")
        print(f"  SMTP_HOST: {'configurado' if self.smtp_host else 'no configurado'}")
        print(f"  SMTP_PORT: {'configurado' if self.smtp_port else 'no configurado'}")
        print(f"  SMTP_USER: {'configurado' if self.smtp_user else 'no configurado'}")
        print(f"  SMTP_PASSWORD: {'configurado' if self.smtp_password else 'no configurado'}")
        print(f"  SMTP_FROM: {'configurado' if self.smtp_from else 'no configurado'}")

    def _generate_factura_pdf(self, factura_data: dict) -> BytesIO:
        """Genera un PDF profesional con la factura."""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
        
        styles = getSampleStyleSheet()
        
        # Estilos personalizados
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=28,
            textColor=colors.HexColor('#2F5233'),
            spaceAfter=6,
            alignment=1,
            fontName='Helvetica-Bold'
        )
        
        subtitle_style = ParagraphStyle(
            'Subtitle',
            parent=styles['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#666666'),
            alignment=1,
            spaceAfter=20
        )
        
        section_title_style = ParagraphStyle(
            'SectionTitle',
            parent=styles['Heading2'],
            fontSize=11,
            textColor=colors.HexColor('#2F5233'),
            textTransform='uppercase',
            spaceAfter=8,
            fontName='Helvetica-Bold'
        )
        
        story = []
        
        # === ENCABEZADO ===
        story.append(Paragraph("🌿 VERDE BENDITO", title_style))
        story.append(Paragraph("Restaurante • Bar • Café", subtitle_style))
        story.append(Spacer(1, 0.15*inch))
        
        # Línea divisora
        story.append(Paragraph("_" * 80, ParagraphStyle('Divider', parent=styles['Normal'], textColor=colors.HexColor('#CCCCCC'))))
        story.append(Spacer(1, 0.15*inch))
        
        # === INFORMACIÓN DE FACTURA ===
        info_data = [
            ['FACTURA Nº', factura_data.get('numero_factura', 'N/A'), 'FECHA', datetime.now().strftime('%d/%m/%Y')],
            ['CLIENTE', factura_data.get('cliente_nombre', 'Cliente'), 'HORA', datetime.now().strftime('%H:%M')],
            ['COMANDA', str(factura_data.get('comanda_id', 'N/A')), 'ESTADO', 'Pagada'],
        ]
        
        info_table = Table(info_data, colWidths=[1.2*inch, 1.8*inch, 1.2*inch, 1.8*inch])
        info_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#2F5233')),
            ('TEXTCOLOR', (2, 0), (2, -1), colors.HexColor('#2F5233')),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F5F5F5')),
            ('PADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#DDDDDD')),
        ]))
        story.append(info_table)
        story.append(Spacer(1, 0.3*inch))
        
        # === TABLA DE ITEMS ===
        items = factura_data.get('items', [])
        items_data = [['PRODUCTO', 'CANTIDAD', 'PRECIO UNITARIO', 'SUBTOTAL']]
        
        for item in items:
            items_data.append([
                str(item.get('nombre', 'Item')),
                str(item.get('cantidad', 1)),
                f"₡{float(item.get('precio', 0)):,.2f}",
                f"₡{float(item.get('subtotal', 0)):,.2f}"
            ])
        
        items_table = Table(items_data, colWidths=[2.5*inch, 1*inch, 1.5*inch, 1.5*inch])
        items_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2F5233')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('TOPPADDING', (0, 0), (-1, 0), 8),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#DDDDDD')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F9F9F9')]),
            ('PADDING', (0, 1), (-1, -1), 8),
        ]))
        story.append(items_table)
        story.append(Spacer(1, 0.2*inch))
        
        # === TOTALES ===
        subtotal = float(factura_data.get('subtotal', 0))
        impuesto = float(factura_data.get('impuesto', 0))
        total = float(factura_data.get('total', subtotal + impuesto))
        
        totals_data = [
            ['SUBTOTAL', f"₡{subtotal:,.2f}"],
            ['IMPUESTO (13%)', f"₡{impuesto:,.2f}"],
            ['TOTAL', f"₡{total:,.2f}"],
        ]
        
        totals_table = Table(totals_data, colWidths=[4.5*inch, 2*inch])
        totals_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (0, 1), 'Helvetica'),
            ('FONTNAME', (1, 0), (1, 1), 'Helvetica'),
            ('FONTNAME', (0, 2), (1, 2), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 1), 9),
            ('FONTSIZE', (0, 2), (-1, 2), 12),
            ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#2F5233')),
            ('TEXTCOLOR', (0, 2), (-1, 2), colors.whitesmoke),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#DDDDDD')),
            ('PADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(totals_table)
        story.append(Spacer(1, 0.4*inch))
        
        # === MENSAJE DE AGRADECIMIENTO ===
        thank_you_style = ParagraphStyle(
            'ThankYou',
            parent=styles['Normal'],
            fontSize=13,
            alignment=1,
            textColor=colors.HexColor('#2F5233'),
            spaceAfter=8,
            fontName='Helvetica-Bold'
        )
        
        thank_you_text_style = ParagraphStyle(
            'ThankYouText',
            parent=styles['Normal'],
            fontSize=11,
            alignment=1,
            textColor=colors.HexColor('#2F5233'),
            spaceAfter=12
        )
        
        story.append(Paragraph("¡Gracias por su compra!", thank_you_style))
        story.append(Paragraph("Lo esperamos pronto en Verde Bendito 🌿", thank_you_text_style))
        story.append(Spacer(1, 0.2*inch))
        
        # Línea divisora
        story.append(Paragraph("_" * 80, ParagraphStyle('Divider', parent=styles['Normal'], textColor=colors.HexColor('#CCCCCC'))))
        story.append(Spacer(1, 0.1*inch))
        
        # === FOOTER ===
        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=8,
            alignment=1,
            textColor=colors.HexColor('#999999')
        )
        
        story.append(Paragraph("Esta es una factura electrónica", footer_style))
        story.append(Paragraph("Verde Bendito • Restaurante • Bar • Café", footer_style))
        
        # Generar PDF
        doc.build(story)
        buffer.seek(0)
        return buffer

    def enviar_factura_por_email(self, email_cliente: str, factura_data: dict) -> bool:
        """Envía la factura por email con PDF adjunto."""
        if not email_cliente or not self.smtp_user or not self.smtp_password:
            print("⚠️ Email o credenciales incompletas")
            return False
        
        try:
            # Crear mensaje
            msg = MIMEMultipart('related')
            msg['From'] = self.smtp_from
            msg['To'] = email_cliente
            msg['Subject'] = f"Factura Verde Bendito #{factura_data.get('numero_factura', 'N/A')}"
            
            # Cargar plantilla HTML
            try:
                import os as os_module
                template_path = os_module.path.join(
                    os_module.path.dirname(__file__), 
                    'email_template.html'
                )
                with open(template_path, 'r', encoding='utf-8') as f:
                    html_body = f.read()
                
                # Reemplazar variables en plantilla
                from datetime import datetime
                html_body = html_body.replace('{{INVOICE_NUMBER}}', str(factura_data.get('numero_factura', 'N/A')))
                html_body = html_body.replace('{{DATE}}', datetime.now().strftime('%d/%m/%Y'))
                
                # Calcular totales
                subtotal = float(factura_data.get('subtotal', 0))
                impuesto = float(factura_data.get('impuesto', 0))
                total = float(factura_data.get('total', subtotal + impuesto))
                
                html_body = html_body.replace('{{SUBTOTAL}}', f"₡{subtotal:,.2f}")
                html_body = html_body.replace('{{IMPUESTO}}', f"₡{impuesto:,.2f}")
                html_body = html_body.replace('{{TOTAL}}', f"₡{total:,.2f}")
                
                # Generar filas de items
                items = factura_data.get('items', [])
                items_html = ""
                for item in items:
                    items_html += f"""
                    <tr>
                      <td>{item.get('nombre', 'Item')}</td>
                      <td style="text-align: right;">{item.get('cantidad', 1)}</td>
                      <td style="text-align: right;">₡{float(item.get('precio', 0)):,.2f}</td>
                      <td style="text-align: right;">₡{float(item.get('subtotal', 0)):,.2f}</td>
                    </tr>
                    """
                html_body = html_body.replace('{{ITEMS}}', items_html)
                
            except Exception:
                print("⚠️ No se pudo cargar la plantilla; usando texto plano")
                subtotal = float(factura_data.get('subtotal', 0))
                impuesto = float(factura_data.get('impuesto', 0))
                total = float(factura_data.get('total', subtotal + impuesto))
                
                html_body = f"""
                <html>
                <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
                  <div style="background-color: white; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px;">
                    <h1 style="color: rgb(47, 82, 51); text-align: center;">🌿 VERDE BENDITO</h1>
                    <p>Estimado Cliente,</p>
                    <p>Gracias por su compra en Verde Bendito!</p>
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                      <p><strong>Factura:</strong> #{factura_data.get('numero_factura', 'N/A')}</p>
                      <p><strong>Fecha:</strong> {datetime.now().strftime('%d/%m/%Y')}</p>
                      <p><strong>Subtotal:</strong> ₡{subtotal:,.2f}</p>
                      <p><strong>Impuesto (13%):</strong> ₡{impuesto:,.2f}</p>
                      <p style="font-size: 16px; font-weight: bold;"><strong>Total:</strong> ₡{total:,.2f}</p>
                    </div>
                    <p>La factura está adjunta en PDF.</p>
                    <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; padding: 12px; margin: 20px 0; text-align: center;">
                      <p style="margin: 0;"><strong>⚠️ Mensaje Automático</strong></p>
                      <p style="margin: 5px 0 0 0; font-size: 12px;">Este es un correo electrónico generado automáticamente. Por favor, <strong>no respondas</strong> a este mensaje.</p>
                    </div>
                    <p>¡Lo esperamos pronto! 🌿</p>
                  </div>
                </body>
                </html>
                """
            
            msg.attach(MIMEText(html_body, 'html', 'utf-8'))
            
            # Generar PDF
            pdf_buffer = self._generate_factura_pdf(factura_data)
            
            # Adjuntar PDF
            attachment = MIMEBase('application', 'octet-stream')
            attachment.set_payload(pdf_buffer.read())
            encoders.encode_base64(attachment)
            attachment.add_header('Content-Disposition', f"attachment; filename=Factura_{factura_data.get('numero_factura', 'invoice')}.pdf")
            msg.attach(attachment)
            
            # Enviar
            with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=self.smtp_timeout) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
            
            print("✅ Factura enviada correctamente")
            return True

        except Exception:
            print("❌ Error al enviar factura")
            return False

# Instancia global
email_service = EmailService()
