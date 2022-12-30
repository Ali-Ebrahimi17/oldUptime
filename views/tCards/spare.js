<% layout('layouts/boilerplateTCard')%>

<link rel="stylesheet" href="/7z/content/bootstrap/css/bootstrap.css" type="text/css">
<link rel="stylesheet" href="/7z/content/bootswatch/united.css" type="text/css">
<link rel="stylesheet" href="/7z/content/dashboards.css" type="text/css">
<link rel="stylesheet" href="/7z/content/font-awesome/css/all.css" type="text/css">
<link rel="stylesheet" href="/7z/content/chart-js/chart.min.css" type="text/css">
<script src="/7z/content/jquery/jquery-3.3.1.min.js"></script>
<script src="/7z/content/bootstrap/js/bootstrap.bundle.js"></script>
<script src="/7z/content/chart-js/chart.bundle.min.js"></script>
<script src="/7z/content/chart-js/chartjs-plugin-labels.min.js"></script>
<style>
  body {background-color: black;}
  h5 {color: white; font-size: 1.5rem; margin-bottom: -15px;}
  h3 {color: white;}
  h2 {font-weight: bold;}
  h1 {font-weight: bold; font-size: 4rem;}
</style>

<div class="main-tCard-container">
  <h2 class="main-title">Critical Paint Plant Checks</h2>
  <div class="row" style="width: 100%;">
      <!-- <div class="col-lg check-row">
        <h3>BHL</h3>
        <hr>
        <a href="/tCard/show/BHL">
        <div class="cards-container">
          <div class="<% if (failsBHL > 0 ) { %>card-wrapper-red<% } else { %>card-wrapper-green<% } %>">
              <div class="card-content">
                  <div>
                    <% if (failsBHL > 0 ) { %>
                    <h1><%= failsBHL %></h1>
                    <% } else { %>
                    <h1> <i class="fas fa-check"></i></h1>
                    <% } %>
                  </div>
              </div>
            </div>
        </div>
        </a>
       </div> -->
      
      <div class="col-lg check-row">
        <h3>Loadall</h3>
        <hr>
        <a href="/tCard/show/LDL/Paint Shop/Shot Blast/Days">
          <div class="cards-container">
            <div class="<% if (failsShotBlast > 0 ) { %>card-wrapper-red<% } else if  (containedShotBlast > 0 ) { %>card-wrapper-amber<% } else { %>card-wrapper-green<% } %>">
                <div class="card-content-front">
                  <div>
                    <h5 class="division-card-name">Shot Blast</h5>
                    <br>
                    <% if (failsShotBlast > 0 ) { %>
                    <h1><%= failsShotBlast %></h1>
                    <% } else if (containedShotBlast > 0 ) { %>
                      <h1><%= containedShotBlast %></h1>
                      <% } else { %>
                        <h1> <i style="font-size: 3rem;" class="fas fa-check"></i></h1>
                    <% } %>
                  </div>
                </div>
              </div>
          </div>
          </a>
          <br>
          <a href="/tCard/show/LDL/Paint Shop/Wash/Days">
            <div class="cards-container">
              <div class="<% if (failsPaintT > 0 ) { %>card-wrapper-red<% } else if  (containedPaintT > 0 ) { %>card-wrapper-amber<% } else { %>card-wrapper-green<% } %>">
                  <div class="card-content-front">
                    <div>
                      <h5 class="division-card-name">Wash</h5>
                      <br>
                      <% if (failsPaintT > 0 ) { %>
                      <h1><%= failsPaintT %></h1>
                      <% } else if (containedPaintT > 0 ) { %>
                        <h1><%= containedPaintT %></h1>
                        <% } else { %>
                          <h1> <i style="font-size: 3rem;" class="fas fa-check"></i></h1>
                      <% } %>
                    </div>
                  </div>
                </div>
              </div>
            </a>
            <br>

            <a href="/tCard/show/LDL/Paint Shop/Oven/Days">
              <div class="cards-container">
                <div class="<% if (failsPaintA > 0 ) { %>card-wrapper-red<% } else if  (containedPaintA > 0 ) { %>card-wrapper-amber<% } else { %>card-wrapper-green<% } %>">
                    <div class="card-content-front">
                      <div>
                        <h5 class="division-card-name">Oven</h5>
                        <br>
                        <% if (failsPaintA > 0 ) { %>
                        <h1><%= failsPaintA %></h1>
                        <% } else if (containedPaintA > 0 ) { %>
                          <h1><%= containedPaintA %></h1>
                          <% } else { %>
                            <h1> <i style="font-size: 3rem;" class="fas fa-check"></i></h1>
                        <% } %>
                      </div>
                    </div>
                  </div>
              </div>
            </a>
          <br>

          <a href="/tCard/show/LDL/Paint Shop/Paint/Days">
            <div class="cards-container">
              <div class="<% if (failsOven > 0 ) { %>card-wrapper-red<% } else if  (containedOven > 0 ) { %>card-wrapper-amber<% } else { %>card-wrapper-green<% } %>">
                  <div class="card-content-front">
                    <div>
                      <h5 class="division-card-name">Paint</h5>
                      <br>
                      <% if (failsOven > 0 ) { %>
                      <h1><%= failsOven %></h1>
                      <% } else if (containedOven > 0 ) { %>
                        <h1><%= containedOven %></h1>
                        <% } else { %>
                          <h1> <i style="font-size: 3rem;" class="fas fa-check"></i></h1>
                      <% } %>
                    </div>
                  </div>
                </div>
            </div>
          </a>
          <br>

        </div>

      <!-- <div class="col-lg check-row">
        <h3>EM</h3>
        <hr>
        <a href="/tCard/show/EM">
          <div class="cards-container">
            <div class="<% if (failsEM > 0 ) { %>card-wrapper-red<% } else { %>card-wrapper-green<% } %>">
                <div class="card-content">
                  <div>
                    <% if (failsEM > 0 ) { %>
                    <h1><%= failsEM %></h1>
                    <% } else { %>
                    <h1> <i class="fas fa-check"></i></h1>
                    <% } %>
                  </div>
                </div>
              </div>
          </div>
          </a>
        </div> -->
      
      <div class="col-lg check-row">
        <h3>Heavy Products</h3>
        <hr>
        <a href="/tCard">
          <div class="cards-container">
            <div class="<% if (failsHP > 0 ) { %>card-wrapper-red<% } else { %>card-wrapper-green<% } %>">
                <div class="card-content-front">
                  <div>
                    <% if (failsHP > 0 ) { %>
                    <h1><%= failsHP %></h1>
                    <% } else { %>
                      <h1> <i style="font-size: 3rem;" class="fas fa-check"></i></h1>
                    <% } %>
                  </div>
                </div>
              </div>
          </div>
          </a>
        </div>

      <div class="col-lg check-row">
        <h3>Compact Products</h3>
        <hr>
        <a href="/tCard">
          <div class="cards-container">
            <div class="<% if (failsHP > 0 ) { %>card-wrapper-red<% } else { %>card-wrapper-green<% } %>">
                <div class="card-content-front">
                  <div>
                    <% if (failsHP > 0 ) { %>
                    <h1><%= failsHP %></h1>
                    <% } else { %>
                      <h1> <i style="font-size: 3rem;" class="fas fa-check"></i></h1>
                    <% } %>
                  </div>
                </div>
              </div>
          </div>
          </a>
        </div>

      <!-- <div class="col-lg check-row">
        <h3>LP</h3>
        <hr>
        <a href="/tCard/show/LP">
          <div class="cards-container">
            <div class="<% if (failsLP > 0 ) { %>card-wrapper-red<% } else { %>card-wrapper-green<% } %>">
                <div class="card-content">
                  <div>
                    <% if (failsLP > 0 ) { %>
                    <h1><%= failsLP %></h1>
                    <% } else { %>
                    <h1> <i class="fas fa-check"></i></h1>
                    <% } %>
                  </div>
                </div>
              </div>
          </div>
          </a>
        </div> -->

      <!-- <div class="col-lg check-row">
        <h3>SD</h3>
        <hr>
        <a href="/tCard/show/SD">
          <div class="cards-container">
            <div class="<% if (failsSD > 0 ) { %>card-wrapper-red<% } else { %>card-wrapper-green<% } %>">
                <div class="card-content">
                  <div>
                    <% if (failsSD > 0 ) { %>
                    <h1><%= failsSD %></h1>
                    <% } else { %>
                    <h1> <i class="fas fa-check"></i></h1>
                    <% } %>
                  </div>
                </div>
              </div>
          </div>
          </a>
        </div> -->

    </div>
  </div>





  <div class="table-wrapper">
  <table id="consumption-data" class="data table-hover">
      <thead class="header">
          <tr style="height: 40px; font-size: 20px;">
              <th><%= frequency %> Checks</th>
              <!-- <th><%= 0 + 0 %> </th> -->

          </tr>
      </thead>
      <tbody class="results">
         
          <% for (let card of cards) { %>
              <% card.checks.sort((a, b) => b.createdAt - a.createdAt) %>
              <tr>
                  <th style="font-weight: bold; height: 82px; width: 120px;"><%= card.name %></th>
                  <% for (let check of card.checks) { %>
                      <td style="font-weight: bold; text-align: center; width: 50px; padding-left: 30px;">
                          <%= moment(check.createdAt).format("DD/MM/YYYY") %><br>
                          <%= moment(check.createdAt).format("HH:mm") %><br>
                          <%= check.result %><br>
                      </td>
                  <%} %>
              </tr>
          <% } %>
      </tbody>
  </table>
</div>

let ldlDaysEmails = [
		'mark.norton@jcb.com',
		'richard.birchall@jcb.com',
		'ali.ebrahimi@jcb.com',
		'adam.ball.key@jcb.com',
		'grant.brookes@jcb.com',
		'john.thacker@jcb.com',
		'geoff.edensor@jcb.com',
		'craig.archer@jcb.com',
		'jason.washington@jcb.com',
		'shane.davis@jcb.com',
		'mark.cornwell@jcb.com',
		'russell.salt@jcb.com',
		'ian.minshall@jcb.com',
		'nigel.wilcox@jcb.com',
	]
	let ldlDaysEmailsEsc = [
		'mark.norton@jcb.com',
		'richard.birchall@jcb.com',
		'ali.ebrahimi@jcb.com',
		'adam.ball.key@jcb.com',
		'grant.brookes@jcb.com',
		'john.thacker@jcb.com',
		'geoff.edensor@jcb.com',
		'craig.archer@jcb.com',
		'jason.washington@jcb.com',
		'shane.davis@jcb.com',
		'mark.cornwell@jcb.com',
		'russell.salt@jcb.com',
		'ian.minshall@jcb.com',
		'nigel.wilcox@jcb.com',
	]