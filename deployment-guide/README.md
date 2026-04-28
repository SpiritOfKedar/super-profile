# Website Builder - AWS EC2 Deployment Guide

Complete step-by-step manual deployment guide for deploying your Next.js website builder application on AWS EC2 with Nginx.

## Quick Start

Follow these files in order:

1. **[Pre-Deployment Checklist](1-PRE-DEPLOYMENT-CHECKLIST.md)** - What you need before starting
2. **[Launch EC2 Instance](2-LAUNCH-EC2-INSTANCE.md)** - Create and configure your EC2 instance
3. **[Server Setup](3-SERVER-SETUP.md)** - Install Node.js, Nginx, and dependencies
4. **[Deploy Application](4-DEPLOY-APPLICATION.md)** - Upload and setup your application
5. **[Setup PM2](5-SETUP-PM2.md)** - Configure process manager
6. **[Configure Nginx](6-CONFIGURE-NGINX.md)** - Setup reverse proxy
7. **[Setup SSL](7-SETUP-SSL.md)** - HTTPS configuration (optional)
8. **[Maintenance](8-MAINTENANCE.md)** - Common tasks and troubleshooting

## Environment Variables

Use the root [`.env.example`](../.env.example) as the source of truth when creating your production `.env` file.

Google OAuth requires:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI` (recommended to avoid proxy/host mismatch issues)

## Tech Stack

- **Framework**: Next.js 16.1.6
- **Runtime**: Node.js 20.x
- **Process Manager**: PM2
- **Web Server**: Nginx
- **Services**: MongoDB Atlas, Google OAuth, Razorpay, Nodemailer, Cloudinary

## Estimated Time

- **First-time deployment**: 30-45 minutes
- **Updates**: 5-10 minutes

## Troubleshooting

**Website not loading after deployment?** See **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** for detailed debugging steps.

If you encounter issues:

1. Check the **[TROUBLESHOOTING](TROUBLESHOOTING.md)** guide first
2. Review application logs: `pm2 logs website-builder`
3. Review Nginx logs: `sudo tail -f /var/log/nginx/error.log`
4. Check the [Maintenance](8-MAINTENANCE.md) guide for common tasks

## Important Notes

- Minimum recommended instance: **t2.small** (t2.micro may run out of memory during build)
- Make sure to configure **Security Groups** properly (ports 22, 80, 443)
- **Backup your .pem key file** - you cannot download it again
- Keep your `.env` file secure and never commit it to version control
- For production, always use **HTTPS** (see Step 7)

## Quick Commands Reference

```bash
# Check application status
pm2 status

# View logs
pm2 logs website-builder

# Restart application
pm2 restart website-builder

# Restart Nginx
sudo systemctl restart nginx

# Check Nginx status
sudo systemctl status nginx
```

## Security Checklist

- [ ] Remove port 3000 from Security Group after nginx setup
- [ ] Setup SSL certificate (HTTPS)
- [ ] Enable UFW firewall
- [ ] Use strong SSH keys
- [ ] Keep system packages updated
- [ ] Regular backups of application and .env file

---

**Ready to deploy?** Start with [1-PRE-DEPLOYMENT-CHECKLIST.md](1-PRE-DEPLOYMENT-CHECKLIST.md)
