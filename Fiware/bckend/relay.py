import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
from sandbox_routes import sandbox_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(sandbox_bp)

FIWARE_URL = "http://localhost:1026/v2/entities/loom_01"

# SMTP Configuration
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = "kingofversaillesinfinity@gmail.com"
SENDER_PASSWORD = "uqxj odfd hjpo rmom"
RECIPIENT_EMAIL = "kingofversaillesinfinity@gmail.com"

def send_email_alert(subject, message_text):
    try:
        msg = MIMEMultipart('alternative')
        msg['From'] = SENDER_EMAIL
        msg['To'] = RECIPIENT_EMAIL
        msg['Subject'] = subject

        # Create a professional HTML body
        html = f"""
        <html>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f9; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border: 1px solid #e0e0e0;">
                <div style="background-color: #ff1744; padding: 25px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">CRITICAL SYSTEM ALERT</h1>
                </div>
                <div style="padding: 30px; color: #333333; line-height: 1.6;">
                    <p style="font-size: 18px; font-weight: bold; color: #ff1744;">Action Required: Loom Stopped</p>
                    <p style="font-size: 16px;">{message_text}</p>
                    
                    <div style="background-color: #fff8f8; border-left: 4px solid #ff1744; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0; font-family: monospace; font-size: 14px;">
                            <strong>Source:</strong> Handloom Digital Twin Monitoring<br>
                            <strong>Status:</strong> ABNORMAL_PATTERN_DETECTED<br>
                            <strong>Timestamp:</strong> {requests.utils.quote(requests.utils.quote(''))} # Placeholder for actual time if needed
                        </p>
                    </div>

                    <p style="font-size: 14px; color: #666666;">Please inspect the physical loom for yarn breakage, motor overheating, or mechanical obstructions before restarting the weaving cycle via the control panel.</p>
                </div>
                <div style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
                    <p style="margin: 0; font-size: 12px; color: #999999;">&copy; 2026 Handloom Digital Twin System. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        part1 = MIMEText(message_text, 'plain')
        part2 = MIMEText(html, 'html')

        msg.attach(part1)
        msg.attach(part2)

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False

@app.route('/twin')
def twin():
    try:
        res = requests.get(FIWARE_URL)
        return jsonify(res.json())
    except Exception as e:
        return {"error": str(e)}

ESP32_LIVE_URL = "http://10.195.63.106:5000/live"

@app.route('/live')
def live():
    try:
        res = requests.get(ESP32_LIVE_URL, timeout=3)
        return jsonify(res.json())
    except Exception as e:
        return {"error": str(e)}, 502

@app.route('/send-alert', methods=['POST'])
def send_alert():
    data = request.json
    message = data.get('message', 'No message provided')
    subject = data.get('subject', 'Handloom Digital Twin Alert')
    
    success = send_email_alert(subject, message)
    if success:
        return {"status": "success"}
    else:
        return {"status": "error", "message": "Failed to send email"}, 500

if __name__ == "__main__":
    app.run(port=5050)