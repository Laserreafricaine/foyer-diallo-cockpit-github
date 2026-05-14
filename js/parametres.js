(function(){
  const A = window.App;

  A.renderParametres = () => {
    A.ensureSettings();
    const s = A.state.settings;
    const esc = v => String(v||'')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/"/g,'&quot;');

    const depLines =
      A.state.lines.filter(
        l => l.type==='dépense' && l.actif
      );

    const groupes =
      s.groupesMobiles || [];

    const allMobileCats =
      (s.categories['dépense'] || []);

    const assignedCats =
      new Set(
        groupes.flatMap(
          g => g.cats || []
        )
      );

    const orphanCats =
      allMobileCats.filter(
        c => !assignedCats.has(c)
      );

    document.getElementById('app').innerHTML = `

    <div class="tabs">

      <button
        class="${A.paramTab==='identite'?'active':''}"
        onclick="App.paramTab='identite';App.renderParametres()"
      >
        Identité
      </button>

      <button
        class="${A.paramTab==='membres'?'active':''}"
        onclick="App.paramTab='membres';App.renderParametres()"
      >
        Membres
      </button>

      <button
        class="${A.paramTab==='categories'?'active':''}"
        onclick="App.paramTab='categories';App.renderParametres()"
      >
        Catégories
      </button>

      <button
        class="${A.paramTab==='groupes'?'active':''}"
        onclick="App.paramTab='groupes';App.renderParametres()"
      >
        Groupes mobiles
      </button>

    </div>

    ${(A.paramTab||'identite')==='groupes' ? `

    <div class="grid two">

      <div class="card">

        <div class="section-title">

          <h3>
            Groupes mobiles → Suivi
          </h3>

          <div
            style="
              display:flex;
              gap:10px;
              flex-wrap:wrap
            "
          >

            <button
              class="secondary"
              onclick="App.exportBudgetMobile()"
              style="
                background:#7f1d1d;
                color:#fff;
                border:none;
              "
            >
              Exporter budget prévu mobile
            </button>

            <button
              onclick="App.editGroupe()"
            >
              + Nouveau groupe
            </button>

          </div>

        </div>

        <p
          class="muted"
          style="
            margin-bottom:14px;
            font-size:13px
          "
        >
          Définissez comment les catégories
          de la PWA sont regroupées dans les
          lignes du suivi mensuel.
        </p>

        ${groupes.length
          ? groupes.map((g,i)=>`

          <div class="groupe-card">

            <div class="groupe-head">

              <div>

                <strong>
                  ${g.nom}
                </strong>

                <span
                  class="muted"
                  style="
                    font-size:12px;
                    margin-left:8px
                  "
                >
                  →
                  ${g.ligneSuivi||'non mappé'}
                </span>

              </div>

              <div
                style="
                  display:flex;
                  gap:6px
                "
              >

                <button
                  class="ghost icon-btn"
                  onclick="App.editGroupe(${i})"
                >
                  Éditer
                </button>

                <button
                  class="danger icon-btn"
                  onclick="App.deleteGroupe(${i})"
                >
                  ×
                </button>

              </div>

            </div>

            <div
              class="chips-list"
              style="margin-top:8px"
            >

              ${(g.cats||[])
                .map(c=>`
                  <span class="edit-chip green">
                    ${c}
                  </span>
                `)
                .join('')
              }

            </div>

          </div>

        `).join('')

        : `
          <p class="muted">
            Aucun groupe défini.
          </p>
        `}

      </div>

      <div class="card">

        <h3>
          Catégories orphelines
        </h3>

        <p
          class="muted"
          style="
            margin:8px 0 14px;
            font-size:13px
          "
        >
          Ces catégories mobiles ne sont
          assignées à aucun groupe.
        </p>

        ${orphanCats.length

          ? `

          <div class="chips-list">

            ${orphanCats.map(c=>`

              <span class="edit-chip amber">

                ${c}

                <button
                  onclick="App.assignOrphan('${c}')"
                  title="Assigner"
                >
                  +
                </button>

              </span>

            `).join('')}

          </div>

          `

          : `

          <p
            class="muted"
            style="color:var(--green)"
          >
            ✓ Toutes les catégories
            sont assignées.
          </p>

          `
        }

      </div>

    </div>

    ` : ``}
    `;
  };

  /* =====================================================
     EXPORT BUDGET MOBILE
  ===================================================== */

  A.exportBudgetMobile = () => {

    try {

      A.ensureSettings();

      const month =
        A.state.currentMonth ||
        new Date()
          .toISOString()
          .slice(0,7);

      const groupes =
        A.state.settings.groupesMobiles || [];

      const suivi =
        A.state.suiviMensuel ||
        A.state.suivi ||
        {};

      const moisData =
        suivi[month] || {};

      const budgets =
        groupes.map(g => {

          let prevu = 0;

          if (
            g.ligneSuivi &&
            moisData[g.ligneSuivi]
          ) {

            prevu = Number(
              moisData[g.ligneSuivi]
                .prevu || 0
            );

          }

          else if (
            Array.isArray(moisData.lignes)
          ) {

            const ligne =
              moisData.lignes.find(
                l => l.nom === g.ligneSuivi
              );

            if (ligne) {

              prevu = Number(
                ligne.prevu ||
                ligne.montant ||
                0
              );

            }
          }

          return {
            categorie: g.nom,
            prevu
          };

        });

      const payload = {
        mois: month,
        budgets
      };

      console.log(
        'EXPORT MOBILE',
        payload
      );

      const blob = new Blob(
        [
          JSON.stringify(
            payload,
            null,
            2
          )
        ],
        {
          type:'application/json'
        }
      );

      const url =
        URL.createObjectURL(blob);

      const a =
        document.createElement('a');

      a.href = url;

      a.download =
        'budget-mobile.json';

      document.body.appendChild(a);

      a.click();

      a.remove();

      URL.revokeObjectURL(url);

      alert(
        'budget-mobile.json exporté'
      );

    }

    catch(err) {

      console.error(
        'EXPORT MOBILE ERROR',
        err
      );

      alert(
        'Erreur export budget mobile'
      );

    }

  };

})();