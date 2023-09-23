---
title: Deploy Django ASGI to ubuntu as service
description: Deploy Django ASGI to ubuntu as service
lang: 'ubuntu'
tag: [ 'django', 'blog', 'linux','nginx', 'gunicorn', 'ubuntu' ]
slug: 'django-asgi-deploy-ubuntu'
---

<br/>
Here is the code to deploy Django Asgi Application to Ubuntu.
Create Service file in /etc/systemd/system/gunicorn.service
<br>
<br>
<CodeBlock>

```text
[Unit]
Description=Django System
Requires=gunicorn.socket
After=network.target
[Service]
User=root
RemainAfterExit=yes
Restart=always
Group=www-data
WorkingDirectory=/location/of/your/project
ExecStart=/usr/local/bin/gunicorn \
          -k uvicorn.workers.UvicornWorker \
          --workers 3 \
          --bind unix:/run/gunicorn.sock \
          DJANGO.asgi:application

[Install]
WantedBy=multi-user.target

```

</CodeBlock>

<br/>
create gunicorn.socket file in /etc/systemd/system/gunicorn.socket
<br>
<br>
<CodeBlock>


```text
[Unit]
Description=gunicorn socket
[Socket]
ListenStream=/run/gunicorn.sock
[Install]
WantedBy=sockets.target
```
</CodeBlock>
