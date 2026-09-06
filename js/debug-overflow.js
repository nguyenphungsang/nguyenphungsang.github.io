(function () {
    'use strict';

    function scan() {
        var de = document.documentElement;
        var cw = de.clientWidth;
        var offenders = [];

        var all = document.querySelectorAll('body *');
        for (var i = 0; i < all.length; i++) {
            var el = all[i];
            if (el.id === 'overflowReport') continue;

            var r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) continue;
            if (r.right <= cw + 1) continue;

            var clipped = false;
            var a = el.parentElement;
            while (a && a !== de) {
                var ox = getComputedStyle(a).overflowX;
                if (ox === 'hidden' || ox === 'clip' || ox === 'auto' || ox === 'scroll') {
                    clipped = true;
                    break;
                }
                a = a.parentElement;
            }
            if (clipped) continue;

            offenders.push({
                name: el.tagName.toLowerCase() +
                      (el.id ? '#' + el.id : '') +
                      (el.className ? '.' + String(el.className).trim().split(/\s+/).slice(0, 2).join('.') : ''),
                over: Math.round(r.right - cw),
                w: Math.round(r.width),
                pos: getComputedStyle(el).position
            });
        }

        offenders.sort(function (x, y) { return y.over - x.over; });

        var probe = document.createElement('span');
        probe.style.cssText = 'position:absolute;visibility:hidden;font-size:40px';
        probe.textContent = 'iiiiiiiiiiWWWWWWWWWW';
        document.body.appendChild(probe);
        probe.style.fontFamily = 'monospace';
        var wMono = probe.getBoundingClientRect().width;
        probe.style.fontFamily = "'Fira Code', monospace";
        var wFira = probe.getBoundingClientRect().width;
        probe.style.fontFamily = 'sans-serif';
        var wSans = probe.getBoundingClientRect().width;
        probe.style.fontFamily = "'Tajawal', sans-serif";
        var wTajawal = probe.getBoundingClientRect().width;
        document.body.removeChild(probe);

        var lines = [];
        lines.push('layout=' + cw + '  window=' + window.innerWidth +
                   '  scrollW=' + de.scrollWidth + '  TRAN=' + (de.scrollWidth - cw) + 'px');
        lines.push('dpr=' + window.devicePixelRatio +
                   '  visualVP=' + (window.visualViewport ? Math.round(window.visualViewport.width) : 'n/a') +
                   '  scale=' + (window.visualViewport ? window.visualViewport.scale.toFixed(2) : 'n/a'));
        lines.push('FiraCode=' + (Math.abs(wFira - wMono) > 0.5 ? 'CO' : 'KHONG') +
                   '  Tajawal=' + (Math.abs(wTajawal - wSans) > 0.5 ? 'CO' : 'KHONG') +
                   '  Tailwind=' + (document.querySelector('style[data-tailwind], #tailwind-cdn') ||
                                    window.tailwind ? 'CO' : 'KHONG'));

        if (offenders.length === 0) {
            lines.push('KHONG co phan tu nao vuot mep phai.');
        } else {
            for (var k = 0; k < Math.min(6, offenders.length); k++) {
                var o = offenders[k];
                lines.push((k + 1) + ') ' + o.name + '  +' + o.over + 'px  (rong ' + o.w + ', ' + o.pos + ')');
            }
        }

        var box = document.getElementById('overflowReport');
        if (!box) {
            box = document.createElement('div');
            box.id = 'overflowReport';
            box.style.cssText =
                'position:fixed;top:0;left:0;right:0;z-index:2147483647;' +
                'background:#111;color:#0f0;font:11px/1.45 monospace;' +
                'padding:8px 10px;white-space:pre-wrap;word-break:break-all;' +
                'border-bottom:2px solid #0f0;max-height:45vh;overflow:auto';
            document.body.appendChild(box);
            box.addEventListener('click', function () { box.remove(); });
        }
        box.textContent = lines.join('\n') + '\n(chạm vào đây để tắt)';
    }

    function boot() {
        setTimeout(scan, 4000);
        window.addEventListener('resize', function () { setTimeout(scan, 300); });
    }

    if (document.readyState === 'complete') boot();
    else window.addEventListener('load', boot);
})();