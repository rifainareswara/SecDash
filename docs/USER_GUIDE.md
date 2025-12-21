# SecDash User Guide

Welcome to **SecDash** (formerly WireGuard Admin), a modern, secure dashboard for managing your WireGuard VPN server. This guide will help you navigate and use the application effectively.

## 1. Getting Started

### Login
Access the dashboard via your browser (default: `http://localhost:3000`).
- **Default Username:** `admin`
- **Default Password:** `password` (Please change this immediately in the Admin Users section!)

## 2. Dashboard Overview
The main dashboard provides a high-level view of your VPN status:
- **Connected Clients:** Number of currently active peers.
- **Total Data Usage:** Aggregate bandwidth consumed.
- **System Health:** CPU and RAM usage of the server.
- **Client List:** A quick view of all registered WireGuard clients.

## 3. Managing WireGuard Clients
Navigate to **WireGuard Clients** from the sidebar.

### Adding a Client
1.  Click the **"New Client"** button.
2.  Enter a name for the client (e.g., "John's iPhone").
3.  The system automatically generates a secure Key Pair and IP address.
4.  Click **Create**.

### Using a Client
Once created, you can:
- **Download Config:** Click the download icon to get the `.conf` file.
- **QR Code:** Click the eye icon to view the QR code for easy scanning with the WireGuard mobile app.

### Deleting a Client
1.  Click the trash icon next to a client.
2.  Confirm the deletion in the modal popup.
3.  The client is immediately removed from the server interface and configuration is deleted.

## 4. Access Control (Traffic Monitor)
**SecDash** includes a powerful feature to monitor traffic to specific internal servers.
Navigate to **Access Control** (Shield icon).

### Monitoring a Server
If you want to know when VPN users access your internal servers (e.g., a Database or File Server):
1.  Click **"Monitor Server"**.
2.  Enter a friendly **Name** (e.g., "Production DB").
3.  Enter the **IP Address** (e.g., `10.0.0.50`).
4.  Click **Start Monitoring**.

### Viewing Traffic Logs
The table on this page updates in real-time (every 5 seconds) to show:
- **Client IP:** Which VPN user is accessing the server.
- **Target Server:** Which monitored server they are hitting.
- **Port:** The destination port (e.g., 80, 443, 5432).
- **Hits:** Number of packets detected in the last minute.

## 5. Server Configuration
Navigate to **WireGuard Server** (DNS icon).
- Configure the server's listening port, private key, and internal subnet.
- **Post Up/Down Scripts:** useful for setting up complex iptables rules for NAT or firewalling.

## 6. Other Features
- **VPN Connections:** A live view of the WireGuard interface (handshakes, data transfer).
- **Status:** Detailed system metrics (CPU, Memory, Uptime).
- **WoL Hosts:** Manage Wake-on-LAN hosts to wake up devices on your network.
- **Access Logs:** View audit logs of who logged into this dashboard and what actions they took.
- **Admin Users:** Create additional admin accounts or change passwords.
